"""Declarative base for SQLAlchemy 2.0 ORM models.

ORM models (sensors, readings, ...) land in app.models in Phase 1 and inherit from
this Base. Keeping the base isolated avoids import cycles between models and session.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
