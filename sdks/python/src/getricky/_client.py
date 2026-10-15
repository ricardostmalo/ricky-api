import asyncio
import email.utils
import os
import random
import time
import uuid
from typing import (
    Any,
    AsyncIterator,
    Awaitable,
    Callable,
    Dict,
    Generic,
    Iterator,
    Mapping,
    Optional,
    Tuple,
    TypeVar,
)
from urllib.parse import quote

import httpx
from typing_extensions import ParamSpec

from ._errors import RickyConnectionError, RickyError
from ._operations import AsyncOperations, SyncOperations
from ._page import Page
from ._version import __version__

DEFAULT_BASE_URL = "https://getricky.ai/api/v1"
DEFAULT_TIMEOUT = 120.0
DEFAULT_MAX_RETRIES = 2
RETRYABLE_STATUSES = frozenset({429, 500, 502, 503, 504})
MAX_RETRY_AFTER_SECONDS = 60.0

T = TypeVar("T")
P = ParamSpec("P")


class _Base:
    """What the sync and async clients share: building requests and deciding retries."""

    def __init__(self, api_key: Optional[str], base_url: str, max_retries: int) -> None:
        key = api_key if api_key is not None else os.environ.get("RICKY_API_KEY")
        if not key:
            raise ValueError("Pass an API key or set RICKY_API_KEY.")
        self._headers = {
            "Authorization": f"Bearer {key}",
            "User-Agent": f"getricky-python/{__version__}",
        }
        self._base_url = base_url.rstrip("/")
        self._max_retries = max_retries

    def _build(
        self,
        method: str,
        path: str,
        path_parameters: Optional[Mapping[str, str]] = None,
        query: Optional[Mapping[str, Any]] = None,
        body: Any = None,
        idempotent: bool = False,
        idempotency_key: Optional[str] = None,
    ) -> httpx.Request:
        url = self._base_url + path.format(
            **{name: quote(str(value), safe="") for name, value in (path_parameters or {}).items()}
        )
        headers = dict(self._headers)
        if idempotent:
            headers["Idempotency-Key"] = idempotency_key or str(uuid.uuid4())
        params = {name: _query_value(value) for name, value in (query or {}).items() if value is not None}
        return httpx.Request(method, url, headers=headers, params=params, json=body)

    def _attempts(self, request: httpx.Request) -> int:
        retryable = request.method in ("GET", "HEAD") or "Idempotency-Key" in request.headers
        return 1 + self._max_retries if retryable else 1

    @staticmethod
    def _parse(response: httpx.Response) -> Any:
        if response.is_success:
            return response.json() if response.content else {}
        raise RickyError.from_response(response)


class Ricky(_Base, SyncOperations):
    """A client for one organization's API key.

    Every operation is a method named after its ``operationId`` in snake case.
    Path parameters come first, then the request body (a dict), then query
    parameters as keywords. Methods return the response body, ``{"data": ...}``
    or ``{"data": [...], "next_cursor": ...}``, and raise ``RickyError`` or
    ``RickyConnectionError``.

    Writes that accept an ``Idempotency-Key`` get a random one unless you pass
    ``idempotency_key=``. Reads and keyed writes are retried on connection
    errors, 429 and 5xx, honoring ``Retry-After``.

    Args:
        api_key: An organization API key (``rky_live_…``); defaults to the
            ``RICKY_API_KEY`` environment variable. Use it only from a server.
        base_url: Defaults to ``https://getricky.ai/api/v1``.
        max_retries: Retries after the first attempt. Defaults to 2.
        timeout: Seconds per attempt. Defaults to 120: a file send downloads
            the file before it answers.
        http_client: An ``httpx.Client`` to send requests with.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        *,
        base_url: str = DEFAULT_BASE_URL,
        max_retries: int = DEFAULT_MAX_RETRIES,
        timeout: float = DEFAULT_TIMEOUT,
        http_client: Optional[httpx.Client] = None,
    ) -> None:
        super().__init__(api_key, base_url, max_retries)
        self._owns_http = http_client is None
        self._http = http_client if http_client is not None else httpx.Client(timeout=timeout)

    def _request(self, method: str, path: str, **options: Any) -> Any:
        request = self._build(method, path, **options)
        attempts = self._attempts(request)
        for attempt in range(attempts):
            last = attempt == attempts - 1
            try:
                response = self._http.send(request)
            except httpx.TransportError as error:
                if last:
                    raise RickyConnectionError(str(error) or type(error).__name__) from error
                time.sleep(_backoff(attempt))
                continue
            if last or response.status_code not in RETRYABLE_STATUSES:
                return self._parse(response)
            response.close()
            time.sleep(_retry_delay(response, attempt))
        raise AssertionError("unreachable")

    def paginate(self, list_method: Callable[P, "Page[T]"], *args: P.args, **kwargs: P.kwargs) -> "Paginator[T]":
        """Walks a list method page by page, passing each ``next_cursor`` back as ``cursor``.

        Iterating yields items; ``.pages()`` yields whole pages::

            for contact in ricky.paginate(ricky.list_contacts, tag_id=tag_id):
                print(contact["id"])
        """
        return Paginator(list_method, args, kwargs)

    def close(self) -> None:
        """Closes the connections this client opened."""
        if self._owns_http:
            self._http.close()

    def __enter__(self) -> "Ricky":
        return self

    def __exit__(self, *exc_info: object) -> None:
        self.close()


class AsyncRicky(_Base, AsyncOperations):
    """The asyncio version of ``Ricky``: the same methods, awaitable.

    Args:
        api_key: An organization API key (``rky_live_…``); defaults to the
            ``RICKY_API_KEY`` environment variable. Use it only from a server.
        base_url: Defaults to ``https://getricky.ai/api/v1``.
        max_retries: Retries after the first attempt. Defaults to 2.
        timeout: Seconds per attempt. Defaults to 120.
        http_client: An ``httpx.AsyncClient`` to send requests with.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        *,
        base_url: str = DEFAULT_BASE_URL,
        max_retries: int = DEFAULT_MAX_RETRIES,
        timeout: float = DEFAULT_TIMEOUT,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        super().__init__(api_key, base_url, max_retries)
        self._owns_http = http_client is None
        self._http = http_client if http_client is not None else httpx.AsyncClient(timeout=timeout)

    async def _request(self, method: str, path: str, **options: Any) -> Any:
        request = self._build(method, path, **options)
        attempts = self._attempts(request)
        for attempt in range(attempts):
            last = attempt == attempts - 1
            try:
                response = await self._http.send(request)
            except httpx.TransportError as error:
                if last:
                    raise RickyConnectionError(str(error) or type(error).__name__) from error
                await asyncio.sleep(_backoff(attempt))
                continue
            if last or response.status_code not in RETRYABLE_STATUSES:
                return self._parse(response)
            await response.aclose()
            await asyncio.sleep(_retry_delay(response, attempt))
        raise AssertionError("unreachable")

    def paginate(
        self, list_method: Callable[P, Awaitable["Page[T]"]], *args: P.args, **kwargs: P.kwargs
    ) -> "AsyncPaginator[T]":
        """Walks a list method page by page, passing each ``next_cursor`` back as ``cursor``.

        ``async for`` yields items; ``.pages()`` yields whole pages::

            async for contact in ricky.paginate(ricky.list_contacts, tag_id=tag_id):
                print(contact["id"])
        """
        return AsyncPaginator(list_method, args, kwargs)

    async def aclose(self) -> None:
        """Closes the connections this client opened."""
        if self._owns_http:
            await self._http.aclose()

    async def __aenter__(self) -> "AsyncRicky":
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        await self.aclose()


class Paginator(Generic[T]):
    """Items of every page, in order. ``pages()`` yields whole pages instead."""

    def __init__(self, list_method: Callable[..., "Page[T]"], args: Tuple[Any, ...], kwargs: Dict[str, Any]) -> None:
        self._list = list_method
        self._args = args
        self._kwargs = kwargs

    def pages(self) -> Iterator["Page[T]"]:
        cursor = self._kwargs.get("cursor")
        while True:
            page = self._list(*self._args, **{**self._kwargs, "cursor": cursor})
            yield page
            cursor = page["next_cursor"]
            if cursor is None:
                return

    def __iter__(self) -> Iterator[T]:
        for page in self.pages():
            yield from page["data"]


class AsyncPaginator(Generic[T]):
    """Items of every page, in order. ``pages()`` yields whole pages instead."""

    def __init__(
        self, list_method: Callable[..., Awaitable["Page[T]"]], args: Tuple[Any, ...], kwargs: Dict[str, Any]
    ) -> None:
        self._list = list_method
        self._args = args
        self._kwargs = kwargs

    async def pages(self) -> AsyncIterator["Page[T]"]:
        cursor = self._kwargs.get("cursor")
        while True:
            page = await self._list(*self._args, **{**self._kwargs, "cursor": cursor})
            yield page
            cursor = page["next_cursor"]
            if cursor is None:
                return

    async def __aiter__(self) -> AsyncIterator[T]:
        async for page in self.pages():
            for item in page["data"]:
                yield item


def _query_value(value: Any) -> Any:
    return ("true" if value else "false") if isinstance(value, bool) else value


def _retry_delay(response: httpx.Response, attempt: int) -> float:
    """``Retry-After`` (seconds or an HTTP date), capped; exponential backoff without one."""
    header = response.headers.get("retry-after", "").strip()
    if header.isdigit():
        return min(float(header), MAX_RETRY_AFTER_SECONDS)
    if header:
        try:
            moment = email.utils.parsedate_to_datetime(header)
            return min(max(moment.timestamp() - time.time(), 0.0), MAX_RETRY_AFTER_SECONDS)
        except (AttributeError, TypeError, ValueError):  # 3.9 returns None for a bad date
            pass
    return _backoff(attempt)


def _backoff(attempt: int) -> float:
    """0.5 s, 1 s, 2 s … up to 8 s, with up to 25 % jitter below."""
    return min(0.5 * 2.0**attempt, 8.0) * (1 - random.random() * 0.25)
