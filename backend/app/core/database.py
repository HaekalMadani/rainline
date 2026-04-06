import sqlite3
from contextlib import contextmanager
from typing import Generator
from app.core.config import settings

def get_db_connection() -> sqlite3.Connection:
    """Create a database connection with row factory"""
    conn = sqlite3.connect(settings.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Context manager for database connections"""
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()