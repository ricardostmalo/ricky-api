from typing import Any, Optional

import httpx


class RickyError(Exception):
    """The API answered with an error.

    ``code`` is stable and safe to branch on; the message is for people.
    ``code`` and ``request_id`` are None only when the response did not come
    from the API itself (a proxy page, for example).
    """

    def __init__(
        self,
        message: str,
        *,
        status: int,
        code: Optional[str],
        param: Optional[str],
        request_id: Optional[str],
        headers: httpx.Headers,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code
        self.param = param
        self.request_id = request_id
        self.headers = headers

    def __repr__(self) -> str:
        return f"RickyError(status={self.status}, code={self.code!r}, request_id={self.request_id!r})"

    @classmethod
    def from_response(cls, response: httpx.Response) -> "RickyError":
        try:
            body: Any = response.json()
        except ValueError:
            body = None
        error = body.get("error") if isinstance(body, dict) else None
        error = error if isinstance(error, dict) else {}

        def text(value: Any) -> Optional[str]:
            return value if isinstance(value, str) else None

        fallback = f"HTTP {response.status_code}"
        if body is None and response.text:
            fallback += f": {response.text[:200]}"
        return cls(
            text(error.get("message")) or fallback,
            status=response.status_code,
            code=text(error.get("code")),
            param=text(error.get("param")),
            request_id=text(error.get("request_id")) or response.headers.get("x-request-id"),
            headers=response.headers,
        )


class RickyConnectionError(Exception):
    """The request never got an answer: DNS, TLS, a dropped connection or a timeout."""


class WebhookVerificationError(Exception):
    """A webhook delivery failed verification and must be rejected."""
