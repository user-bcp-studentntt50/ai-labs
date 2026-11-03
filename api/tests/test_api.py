import base64
import time
from pathlib import Path

from fastapi.testclient import TestClient
import urllib3

from app.main import create_app


def token(username: str = "student", role: str = "STUDENT") -> str:
    raw = f"{username}|{role}|{int(time.time()) + 3600}|WORKSHOP_SECRET_2026"
    return base64.b64encode(raw.encode()).decode()


def headers(username: str = "student", role: str = "STUDENT") -> dict[str, str]:
    return {"Authorization": f"Bearer {token(username, role)}"}


def test_lists_seeded_tasks(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/tasks", headers=headers())
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_task_response_fields_and_seed_order(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/tasks", headers=headers())
    tasks = response.json()
    assert response.status_code == 200
    assert list(tasks[0]) == [
        "id",
        "title",
        "description",
        "status",
        "owner",
        "priority",
        "createdAt",
    ]
    assert [task["id"] for task in tasks] == sorted(task["id"] for task in tasks)
    assert tasks[0]["title"] == "Refactor login"
    assert tasks[0]["owner"] == "student"


def test_creates_task_and_summary(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        created = client.post(
            "/api/tasks",
            headers=headers(),
            json={"title": "Add tests", "description": "Improve coverage", "status": "TODO", "priority": "HIGH"},
        )
        summary = client.get("/api/summary", headers=headers())
    assert created.status_code == 201
    assert created.json()["owner"] == "student"
    assert summary.json()["total"] == 3


def test_create_task_preserves_observed_defaults(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.post(
            "/api/tasks",
            headers=headers(),
            json={"title": "Default values"},
        )
    assert response.status_code == 201
    assert response.json()["title"] == "Default values"
    assert response.json()["description"] == ""
    assert response.json()["status"] == "TODO"
    assert response.json()["priority"] == "MEDIUM"
    assert response.json()["owner"] == "student"
    assert "createdAt" in response.json()


def test_summary_preserves_observed_response_shape(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/summary", headers=headers())
    assert response.status_code == 200
    assert response.json() == {
        "owner": "student",
        "total": 2,
        "byStatus": {"TODO": 1, "IN_PROGRESS": 1},
        "highPriorityOpen": 1,
    }


def test_summary_excludes_closed_high_priority_tasks(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        for status in ("DONE", "ARCHIVED"):
            client.post(
                "/api/tasks",
                headers=headers(),
                json={"title": status, "status": status, "priority": "HIGH"},
            )
        response = client.get("/api/summary", headers=headers())
    assert response.status_code == 200
    assert response.json()["highPriorityOpen"] == 1


def test_uploads_requirement(tmp_path: Path) -> None:
    upload_dir = tmp_path / "uploads"
    app = create_app(str(tmp_path / "workshop.db"), str(upload_dir))
    with TestClient(app) as client:
        response = client.post(
            "/api/requirements",
            headers=headers(),
            files={"file": ("requirements.txt", b"Login must be accessible", "text/plain")},
        )
    assert response.status_code == 201
    assert (upload_dir / "requirements.txt").exists()
    assert response.json() == {
        "owner": "student",
        "fileName": "requirements.txt",
        "storedAt": str(upload_dir / "requirements.txt"),
        "size": len(b"Login must be accessible"),
    }


def test_rejects_invalid_token(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/tasks", headers={"Authorization": "Bearer invalid"})
    assert response.status_code == 401


def test_invalid_token_error_is_generic(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/tasks", headers={"Authorization": "Bearer invalid"})
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid token"}


def test_rejects_reading_tasks_for_another_owner(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/tasks", headers=headers(), params={"owner": "trainer"})
    assert response.status_code == 403


def test_rejects_summary_for_another_owner(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/summary", headers=headers(), params={"owner": "trainer"})
    assert response.status_code == 403


def test_rejects_creating_task_for_another_owner(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.post(
            "/api/tasks",
            headers=headers(),
            json={"title": "Task", "description": "Owned by another user", "owner": "trainer"},
        )
        trainer_count = app.state.connection.execute(
            "SELECT COUNT(*) FROM tasks WHERE owner = ?", ("trainer",)
        ).fetchone()[0]
    assert response.status_code == 403
    assert trainer_count == 1


def test_allows_owner_matching_identity(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        listed = client.get("/api/tasks", headers=headers(), params={"owner": "student"})
        summary = client.get("/api/summary", headers=headers(), params={"owner": "student"})
        created = client.post(
            "/api/tasks",
            headers=headers(),
            json={"title": "Own task", "description": "Owned by student", "owner": "student"},
        )
    assert listed.status_code == 200
    assert summary.status_code == 200
    assert summary.json()["owner"] == "student"
    assert created.status_code == 201
    assert created.json()["owner"] == "student"


def test_persists_task_values_containing_quotes(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.post(
            "/api/tasks",
            headers=headers(),
            json={"title": "Learner's task", "description": "Review the user's notes"},
        )
    assert response.status_code == 201
    assert response.json()["title"] == "Learner's task"
    assert response.json()["description"] == "Review the user's notes"


def test_backend_health_preserves_response_contract(
    monkeypatch, tmp_path: Path
) -> None:
    class HealthResponse:
        status = 200
        data = b'{"status":"UP"}'

    class PoolManager:
        def request(self, method: str, url: str, timeout: float) -> HealthResponse:
            assert method == "GET"
            assert url == "http://auth.test/health"
            assert timeout == 3.0
            return HealthResponse()

    monkeypatch.setattr(urllib3, "PoolManager", PoolManager)
    monkeypatch.setenv("AUTH_HEALTH_URL", "http://auth.test/health")
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/backend-health", headers=headers())
    assert response.status_code == 200
    assert response.json() == {
        "requestedBy": "student",
        "status": 200,
        "body": '{"status":"UP"}',
    }


def test_backend_health_error_is_generic(
    monkeypatch, tmp_path: Path
) -> None:
    class PoolManager:
        def request(self, method: str, url: str, timeout: float) -> None:
            raise urllib3.exceptions.HTTPError("private connection detail")

    monkeypatch.setattr(urllib3, "PoolManager", PoolManager)
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.get("/api/backend-health", headers=headers())
    assert response.status_code == 200
    assert response.json() == {
        "requestedBy": "student",
        "status": 0,
        "body": "Authentication service unavailable",
    }


def test_invalid_task_types_are_rejected_generically(tmp_path: Path) -> None:
    app = create_app(str(tmp_path / "workshop.db"), str(tmp_path / "uploads"))
    with TestClient(app) as client:
        response = client.post(
            "/api/tasks",
            headers=headers(),
            json={"title": 123, "description": "Invalid title type"},
        )
    assert response.status_code == 422
    assert response.json() == {"detail": "Invalid request"}
