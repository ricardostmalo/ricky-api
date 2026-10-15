from typing import Generic, List, Optional, TypeVar

from typing_extensions import TypedDict

T = TypeVar("T")


class Resource(TypedDict, Generic[T]):
    """A response holding one resource: ``{"data": {...}}``."""

    data: T


class Page(TypedDict, Generic[T]):
    """One page of a list. ``next_cursor`` is None on the last page."""

    data: List[T]
    next_cursor: Optional[str]
