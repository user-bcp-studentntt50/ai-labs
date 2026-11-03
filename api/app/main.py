from __future__ import annotations

from contextlib import asynccontextmanager
import os
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import routes
from .database import connect_database
from .services import DEFAULT_AUTH_HEALTH_URL

DATABASE_PATH_ENV = "WORKSHOP_DB_PATH"
UPLOAD_DIRECTORY_ENV = "WORKSHOP_UPLOAD_DIR"
AUTH_HEALTH_URL_ENV = "AUTH_HEALTH_URL"
DEFAULT_DATABASE_PATH = "./data/workshop.db"
DEFAULT_UPLOAD_DIRECTORY = "./uploads"


def create_app(db_path: str | None = None, upload_dir: str | None = None) -> FastAPI:
    selected_db = db_path or os.getenv(DATABASE_PATH_ENV, DEFAULT_DATABASE_PATH)
    selected_uploads = upload_dir or os.getenv(
        UPLOAD_DIRECTORY_ENV, DEFAULT_UPLOAD_DIRECTORY
    )
    Path(selected_uploads).mkdir(parents=True, exist_ok=True)
    connection = connect_database(selected_db)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        try:
            yield
        finally:
            connection.close()

    app = FastAPI(
        title="Workshop Requirements API",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.state.connection = connection
    app.state.upload_dir = selected_uploads
    app.state.auth_health_url = os.getenv(
        AUTH_HEALTH_URL_ENV, DEFAULT_AUTH_HEALTH_URL
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(routes.router)

    @app.exception_handler(RequestValidationError)
    async def request_validation_error_handler(
        _request: Request, _error: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": "Invalid request"})

    return app


app = create_app()


app = create_app()
