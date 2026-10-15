import hashlib
import hmac
import json
import time
from typing import Mapping, Optional, Union, cast

from ._errors import WebhookVerificationError
from .types import WebhookEvent

DEFAULT_TOLERANCE = 300


def verify_webhook(
    payload: Union[bytes, str],
    headers: Mapping[str, str],
    secret: str,
    tolerance: int = DEFAULT_TOLERANCE,
) -> WebhookEvent:
    """Verifies a delivery and returns its event.

    Pass the raw request body exactly as received, before any JSON parsing,
    and the request headers (any mapping; names are matched case-insensitively).

    ``X-Ricky-Signature`` holds one ``v1=<hex>`` value, or several separated by
    commas while a signing secret is being rotated; the delivery is valid when
    any of them is the HMAC-SHA256 of ``<X-Ricky-Timestamp>.<body>`` with
    ``secret``. Deliveries whose timestamp is more than ``tolerance`` seconds
    from now are rejected, which defeats replays.

    New event types ship without a new API version: handle the ``type`` values
    you know and ignore the rest.

    Raises:
        WebhookVerificationError: the delivery must be rejected.
    """
    if not isinstance(payload, (bytes, bytearray, str)):
        raise WebhookVerificationError("Pass the raw request body, not parsed JSON.")
    if not secret:
        raise WebhookVerificationError("The webhook signing secret is empty.")
    timestamp = _header(headers, "x-ricky-timestamp")
    signatures = _header(headers, "x-ricky-signature")
    if not timestamp or not signatures:
        raise WebhookVerificationError("Missing X-Ricky-Timestamp or X-Ricky-Signature header.")
    if not (timestamp.isascii() and timestamp.isdigit()):
        raise WebhookVerificationError("X-Ricky-Timestamp is not a Unix timestamp.")
    if abs(int(time.time()) - int(timestamp)) > tolerance:
        raise WebhookVerificationError("X-Ricky-Timestamp is outside the tolerance.")
    body = payload.encode("utf-8") if isinstance(payload, str) else bytes(payload)
    digest = hmac.new(secret.encode("utf-8"), timestamp.encode("ascii") + b"." + body, hashlib.sha256)
    expected = ("v1=" + digest.hexdigest()).encode("ascii")
    candidates = [candidate.strip().encode("utf-8") for candidate in signatures.split(",")]
    # Compare every candidate so the time taken does not reveal which one matched.
    matches = [hmac.compare_digest(candidate, expected) for candidate in candidates]
    if not any(matches):
        raise WebhookVerificationError("No signature matches this payload.")
    try:
        return cast(WebhookEvent, json.loads(body))
    except ValueError as error:
        raise WebhookVerificationError("The payload is not JSON.") from error


def _header(headers: Mapping[str, str], name: str) -> Optional[str]:
    value = headers.get(name)
    if value is not None:
        return value
    for key, candidate in headers.items():
        if key.lower() == name:
            return candidate
    return None
