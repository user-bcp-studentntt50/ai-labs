import sqlite3

TASK_TABLE_SQL = (
    "CREATE TABLE IF NOT EXISTS tasks ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, "
    "title TEXT NOT NULL, "
    "description TEXT NOT NULL, "
    "status TEXT NOT NULL, "
    "owner TEXT NOT NULL, "
    "priority TEXT NOT NULL, "
    "created_at TEXT NOT NULL)"
)
INITIAL_TASKS = (
    (
        "Refactor login",
        "Separar responsabilidades en frontend",
        "TODO",
        "student",
        "HIGH",
    ),
    (
        "Review API",
        "Revisar seguridad de endpoints",
        "IN_PROGRESS",
        "student",
        "MEDIUM",
    ),
    (
        "Trainer notes",
        "Preparar retrospectiva",
        "TODO",
        "trainer",
        "LOW",
    ),
)


def initialize_tasks_table(connection: sqlite3.Connection) -> None:
    connection.execute(TASK_TABLE_SQL)


def seed_initial_tasks(connection: sqlite3.Connection) -> None:
    count = connection.execute(
        "SELECT COUNT(*) AS total FROM tasks"
    ).fetchone()["total"]
    if count != 0:
        return
    connection.executemany(
        "INSERT INTO tasks(title,description,status,owner,priority,created_at) "
        "VALUES (?, ?, ?, ?, ?, datetime('now'))",
        INITIAL_TASKS,
    )
    connection.commit()


def fetch_tasks_for_owner(connection: sqlite3.Connection, owner: str) -> list[sqlite3.Row]:
    return connection.execute(
        "SELECT id,title,description,status,owner,priority,created_at "
        "FROM tasks WHERE owner = ? ORDER BY id",
        (owner,),
    ).fetchall()


def insert_task(
    connection: sqlite3.Connection,
    title: str,
    description: str,
    status: str,
    owner: str,
    priority: str,
) -> sqlite3.Row:
    cursor = connection.execute(
        "INSERT INTO tasks(title,description,status,owner,priority,created_at) "
        "VALUES (?, ?, ?, ?, ?, datetime('now'))",
        (title, description, status, owner, priority),
    )
    connection.commit()
    row = connection.execute(
        "SELECT id,title,description,status,owner,priority,created_at "
        "FROM tasks WHERE id = ?",
        (cursor.lastrowid,),
    ).fetchone()
    if row is None:
        raise RuntimeError("Inserted task could not be retrieved")
    return row


def fetch_task_summary_for_owner(
    connection: sqlite3.Connection, owner: str
) -> list[sqlite3.Row]:
    return connection.execute(
        "SELECT status,priority FROM tasks WHERE owner = ?",
        (owner,),
    ).fetchall()
