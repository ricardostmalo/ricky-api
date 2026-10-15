# Ricky Python SDK

The official Python client for the [Ricky](https://getricky.ai) REST API: contacts, conversations, messages, templates and webhooks of one organization.

- Guides and reference: <https://getricky.ai/docs/api>
- Source and OpenAPI description: <https://github.com/ricardostmalo/ricky-api>

Python 3.9 or later. Its only dependencies are `httpx` and `typing-extensions`.

```bash
# Until it is on PyPI:
pip install "git+https://github.com/ricardostmalo/ricky-api#subdirectory=sdks/python"
# Once published:
pip install getricky
```

## Quick start

Create a key in Ricky under **Settings → API** and keep it on your server. `Ricky()` reads it from `RICKY_API_KEY` when you pass none.

```python
import time

from getricky import Ricky

ricky = Ricky()  # or Ricky("rky_live_…")

# The channels the organization can send from.
channels = ricky.list_channels()["data"]
whatsapp = next(channel for channel in channels if channel["type"] == "whatsapp")

# Send an approved WhatsApp template to a phone number. Ricky finds or creates
# the contact and its conversation, and answers with the send it queued.
send = ricky.start_conversation(
    {
        "channel_id": whatsapp["id"],
        "phone": "+50760001234",
        "template": {
            "id": "1234567890",
            "components": [{"type": "body", "parameters": [{"type": "text", "text": "Ana"}]}],
        },
    },
    idempotency_key="order-10482-ready",
)["data"]

# Follow it until the provider accepts it.
while send["status"] == "queued":
    time.sleep(2)
    send = ricky.get_send(send["id"])["data"]
print(send["status"], send["failure_reason"])
```

Every operation of the API is a method named after its `operationId` in snake case (`listContacts` is `list_contacts`). Path parameters come first, then the request body as a dict, then query parameters as keywords. Methods return the response body as the API sends it: `{"data": ...}` for one resource and `{"data": [...], "next_cursor": ...}` for a list. Requests and responses are typed with `TypedDict`s from `getricky.types`, so your editor and type checker know every field, and fields the API adds later reach you without an upgrade.

`AsyncRicky` has the same methods for `asyncio`:

```python
from getricky import AsyncRicky

async with AsyncRicky() as ricky:
    contact = (await ricky.get_contact(contact_id))["data"]
```

## Pagination

`paginate` walks every page of a list method and yields its items; `.pages()` yields whole pages:

```python
for contact in ricky.paginate(ricky.list_contacts, tag_id=tag_id):
    print(contact["id"], contact["first_name"])

for page in ricky.paginate(ricky.list_messages, conversation_id).pages():
    print(len(page["data"]))
```

With `AsyncRicky`, use `async for`.

## Errors

A failed request raises `RickyError` with the API's `code`, the HTTP `status`, the `param` that caused it when known, and the `request_id` to quote to support. A request that never got an answer raises `RickyConnectionError`.

```python
from getricky import RickyError

try:
    ricky.send_message(conversation_id, {"type": "text", "text": "Hola"})
except RickyError as error:
    if error.code == "outside_messaging_window":
        ...  # send an approved template instead
    else:
        raise
```

## Retries and idempotency

Writes that accept an `Idempotency-Key` get a random one unless you pass `idempotency_key=`. Pass your own, derived from your data, to make a retry from your side safe too: the same key and body replay the first response instead of repeating the write.

Reads, and writes that carry a key, are retried twice on connection errors, `429` and `5xx`, waiting as `Retry-After` says or backing off exponentially. Change it with `Ricky(max_retries=…)`. A write the API may have applied before failing answers `request_processing` on retry: read the resource before trying again.

## Webhooks

`verify_webhook` checks the `X-Ricky-Signature` and `X-Ricky-Timestamp` headers against the raw body, rejects deliveries more than five minutes old, and returns the event. With Flask:

```python
from flask import Flask, request
from getricky import WebhookVerificationError, verify_webhook

app = Flask(__name__)


@app.post("/ricky/webhooks")
def ricky_webhook():
    try:
        event = verify_webhook(request.get_data(), request.headers, WEBHOOK_SECRET)
    except WebhookVerificationError:
        return "", 401
    if event["type"] == "message.received":
        ...  # queue the work; deduplicate by event["id"]
    return "", 204
```

Answer within 10 seconds. Deliveries can repeat, so deduplicate by `event["id"]`. New event types ship without a new API version: handle the ones you know and ignore the rest.

## Configuration

```python
Ricky(
    "rky_live_…",
    base_url="https://getricky.ai/api/v1",
    max_retries=2,
    timeout=120.0,  # seconds per attempt; a file send downloads the file before it answers
    http_client=None,  # or your own httpx.Client
)
```

## License

[MIT](LICENSE)
