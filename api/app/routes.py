import sqlite3

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile

from .schemas import (
    BackendHealthResponse,
    Identity,
    RequirementUploadResponse,
    TaskCreateRequest,
    TaskResponse,
    TaskSummaryResponse,
)
from .security import legacy_identity
from .services import (
    DEFAULT_AUTH_HEALTH_URL,
    backend_health,
    create_task,
    list_tasks,
    summarize_tasks,
    upload_requirement,
)

router = APIRouter()


def get_connection(request: Request) -> sqlite3.Connection:
    return request.app.state.connection


def get_upload_dir(request: Request) -> str:
    return request.app.state.upload_dir


def get_auth_health_url(request: Request) -> str:
    return request.app.state.auth_health_url


@router.get("/api/tasks", response_model=list[TaskResponse])
def list_tasks_route(
    owner: str | None = Query(default=None),
    identity: Identity = Depends(legacy_identity),
    connection: sqlite3.Connection = Depends(get_connection),
) -> list[TaskResponse]:
    return list_tasks(connection, owner, identity)


@router.post("/api/tasks", status_code=201, response_model=TaskResponse)
def create_task_route(
    payload: TaskCreateRequest,
    identity: Identity = Depends(legacy_identity),
    connection: sqlite3.Connection = Depends(get_connection),
) -> TaskResponse:
    return create_task(connection, payload, identity)


@router.get("/api/summary", response_model=TaskSummaryResponse)
def summary_route(
    owner: str | None = Query(default=None),
    identity: Identity = Depends(legacy_identity),
    connection: sqlite3.Connection = Depends(get_connection),
) -> TaskSummaryResponse:
    return summarize_tasks(connection, owner, identity)


@router.post(
    "/api/requirements",
    status_code=201,
    response_model=RequirementUploadResponse,
)
async def upload_requirement_route(
    file: UploadFile = File(...),
    identity: Identity = Depends(legacy_identity),
    upload_dir: str = Depends(get_upload_dir),
) -> RequirementUploadResponse:
    return await upload_requirement(upload_dir, file, identity)


@router.get("/api/backend-health", response_model=BackendHealthResponse)
def backend_health_route(
    identity: Identity = Depends(legacy_identity),
    url: str = Depends(get_auth_health_url),
) -> BackendHealthResponse:
    return backend_health(identity, url)
