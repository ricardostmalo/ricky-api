"""A Ricky webhook receiver for Python 3.9 or later, with no dependencies.

    RICKY_WEBHOOK_SECRET=whsec_... python verify_webhook.py

It verifies X-Ricky-Signature over the raw body, rejects timestamps more than
five minutes away, answers 2xx quickly and ignores deliveries it already saw.
"""

import hashlib
import hmac
import json
import os
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Optional

TOLERANCE_SECONDS = 300


def verify_ricky_signature(
    body: bytes, signature: str, timestamp: str, secret: str, now: Optional[float] = None
) -> bool:
    """True when `signature` is Ricky's signature of this exact body and timestamp."""
    if not signature or not timestamp or not timestamp.isdigit():
        return False
    current = time.time() if now is None else now
    if abs(int(current) - int(timestamp)) > TOLERANCE_SECONDS:
        return False
    digest = hmac.new(secret.encode(), timestamp.encode() + b"." + body, hashlib.sha256).hexdigest()
    return hmac.compare_digest("v1=" + digest, signature)


SEEN = set()  # Use a durable store in production.


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        valid = verify_ricky_signature(
            body,
            self.headers.get("X-Ricky-Signature", ""),
            self.headers.get("X-Ricky-Timestamp", ""),
            os.environ["RICKY_WEBHOOK_SECRET"],
        )
        if not valid:
            self.send_response(401)
            self.end_headers()
            return
        event = json.loads(body)
        if event["id"] not in SEEN:
            SEEN.add(event["id"])
            # Queue the work; answer within 10 seconds.
            print(event["type"], event["data"])
        self.send_response(204)
        self.end_headers()


if __name__ == "__main__":
    HTTPServer(("", 3000), Handler).serve_forever()
