import hashlib
import hmac
import json
import time
from pathlib import Path

import pytest

from getricky import WebhookVerificationError, verify_webhook

# Signed by the server's own signDeveloperWebhook; see sdks/README.md.
VECTOR = json.loads((Path(__file__).resolve().parents[2] / "webhook-vectors.json").read_text())
# The vector's timestamp is fixed; a tolerance this wide only skips the clock check.
ANY_TIME = 10**12


def sign(secret, timestamp, body):
    return "v1=" + hmac.new(secret.encode(), f"{timestamp}.{body}".encode(), hashlib.sha256).hexdigest()


def headers(signature, timestamp=VECTOR["timestamp"]):
    return {"X-Ricky-Signature": signature, "X-Ricky-Timestamp": timestamp}


def test_accepts_the_server_signed_vector_and_returns_the_event():
    event = verify_webhook(VECTOR["body"], headers(VECTOR["signature"]), VECTOR["secret"], ANY_TIME)

    assert event["type"] == "message.received"
    assert event["id"] == "0e9a1c42-7f3b-4d58-a6e2-91c4b7d3f805"
    assert event["data"]["message_id"] == "9d27e6b1-3c4f-4a80-b5d9-6e1f2a7c8b44"


def test_accepts_bytes_and_lowercase_header_names():
    lowered = {key.lower(): value for key, value in headers(VECTOR["signature"]).items()}

    assert verify_webhook(VECTOR["body"].encode(), lowered, VECTOR["secret"], ANY_TIME)["type"] == "message.received"


def test_accepts_either_signature_while_a_secret_rotates():
    rotating = headers(VECTOR["rotation_signature"])

    assert verify_webhook(VECTOR["body"], rotating, VECTOR["secret"], ANY_TIME)
    assert verify_webhook(VECTOR["body"], rotating, VECTOR["previous_secret"], ANY_TIME)


@pytest.mark.parametrize(
    ("body", "signature", "secret"),
    [
        (VECTOR["body"], VECTOR["signature"], "whsec_wrong"),
        (VECTOR["body"].replace("message.received", "message.read"), VECTOR["signature"], VECTOR["secret"]),
        (VECTOR["body"], VECTOR["signature"][:-2], VECTOR["secret"]),
        (VECTOR["body"], VECTOR["signature"].replace("v1=", "v0="), VECTOR["secret"]),
    ],
)
def test_rejects_a_wrong_secret_a_tampered_body_and_a_malformed_signature(body, signature, secret):
    with pytest.raises(WebhookVerificationError):
        verify_webhook(body, headers(signature), secret, ANY_TIME)


def test_enforces_the_timestamp_tolerance():
    now = int(time.time())
    body = '{"id":"x","type":"contact.created","data":{}}'

    def at(timestamp):
        return verify_webhook(body, headers(sign("s", timestamp, body), str(timestamp)), "s")

    assert at(now - 299)["id"] == "x"
    for stale in (now - 301, now + 301):
        with pytest.raises(WebhookVerificationError, match="tolerance"):
            at(stale)


def test_returns_event_types_it_does_not_know_yet():
    now = str(int(time.time()))
    body = '{"id":"x","type":"webhook.test","data":{"webhook_id":"w1"}}'

    event = verify_webhook(body, headers(sign("s", now, body), now), "s")

    assert event["type"] == "webhook.test"
    assert event["data"]["webhook_id"] == "w1"  # type: ignore[typeddict-item]


def test_rejects_missing_headers_and_non_numeric_timestamps():
    with pytest.raises(WebhookVerificationError):
        verify_webhook(VECTOR["body"], {}, VECTOR["secret"])
    with pytest.raises(WebhookVerificationError, match="Unix timestamp"):
        verify_webhook(VECTOR["body"], headers(VECTOR["signature"], "yesterday"), VECTOR["secret"])
