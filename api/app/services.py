import logging
import sqlite3
from pathlib import Path

import urllib3
from fastapi import UploadFile

from . import repositories
from .schemas import (
    BackendHealthResponse,
    Identity,
    RequirementUploadResponse,
    TaskCreateRequest,
    TaskResponse,
    TaskSummaryResponse,
)
from .security import owner_for_identity

LOGGER = logging.getLogger(__name__)
HIGH_PRIORITY = "HIGH"
CLOSED_TASK_STATUSES = frozenset({"DONE", "ARCHIVED"})
DEFAULT_AUTH_HEALTH_URL = "http://localhost:8080/q/health"
AUTH_HEALTH_TIMEOUT_SECONDS = 3.0
BACKEND_HEALTH_ERROR_BODY = "Authentication service unavailable"


def list_tasks(
    connection: sqlite3.Connection,
    requested_owner: str | None,
    identity: Identity,
) -> list[TaskResponse]:
    owner = owner_for_identity(requested_owner or None, identity)
    return [
        task_response(row)
        for row in repositories.fetch_tasks_for_owner(connection, owner)
    ]


def create_task(
    connection: sqlite3.Connection,
    payload: TaskCreateRequest,
    identity: Identity,
) -> TaskResponse:
    owner = owner_for_identity(payload.owner, identity)
    row = repositories.insert_task(
        connection,
        payload.title,
        payload.description,
        payload.status,
        owner,
        payload.priority,
    )
    return task_response(row)


def summarize_tasks(
    connection: sqlite3.Connection,
    requested_owner: str | None,
    identity: Identity,
) -> TaskSummaryResponse:
    owner = owner_for_identity(requested_owner or None, identity)
    rows = repositories.fetch_task_summary_for_owner(connection, owner)
    status_counts: dict[str, int] = {}
    high_priority_open = 0
    for row in rows:
        status = row["status"]
        status_counts[status] = status_counts.get(status, 0) + 1
        if row["priority"] == HIGH_PRIORITY and status not in CLOSED_TASK_STATUSES:
            high_priority_open += 1
    return TaskSummaryResponse(
        owner=owner,
        total=len(rows),
        by_status=status_counts,
        high_priority_open=high_priority_open,
    )


async def upload_requirement(
    upload_dir: str,
    file: UploadFile,
    identity: Identity,
) -> RequirementUploadResponse:
    filename = str(file.filename)
    target = Path(upload_dir) / filename
    content = await file.read()
    target.write_bytes(content)
    return RequirementUploadResponse(
        owner=identity.username,
        file_name=file.filename,
        stored_at=str(target),
        size=len(content),
    )


def backend_health(identity: Identity, url: str) -> BackendHealthResponse:
    try:
        response = urllib3.PoolManager().request(
            "GET",
            url,
            timeout=AUTH_HEALTH_TIMEOUT_SECONDS,
        )
        body = response.data.decode("utf-8")
    except (urllib3.exceptions.HTTPError, UnicodeDecodeError):
        LOGGER.exception("Authentication backend health request failed")
        return BackendHealthResponse(
            requested_by=identity.username,
            status=0,
            body=BACKEND_HEALTH_ERROR_BODY,
        )
    return BackendHealthResponse(
        requested_by=identity.username,
        status=response.status,
        body=body,
    )


def task_response(row: sqlite3.Row) -> TaskResponse:
    return TaskResponse(
        id=row["id"],
        title=row["title"],
        description=row["description"],
        status=row["status"],
        owner=row["owner"],
        priority=row["priority"],
        created_at=row["created_at"],
    )
