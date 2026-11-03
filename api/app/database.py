import sqlite3
from pathlib import Path

from . import repositories


def connect_database(db_path: str) -> sqlite3.Connection:
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path, check_same_thread=False)
    connection.row_factory = sqlite3.Row
    try:
        repositories.initialize_tasks_table(connection)
        repositories.seed_initial_tasks(connection)
    except sqlite3.Error:
        connection.close()
        raise
    return connection
