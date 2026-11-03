import sqlite3
from pathlib import Path

import pytest

from app import database


class FailingConnection:
    row_factory = None

    def __init__(self) -> None:
        self.closed = False

    def execute(self, query: str):
        raise sqlite3.DatabaseError("database initialization failed")

    def close(self) -> None:
        self.closed = True


def test_closes_connection_when_initialization_fails(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    connection = FailingConnection()
    monkeypatch.setattr(database.sqlite3, "connect", lambda *args, **kwargs: connection)

    with pytest.raises(sqlite3.DatabaseError):
        database.connect_database(str(tmp_path / "workshop.db"))

    assert connection.closed
