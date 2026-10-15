# Ricky API

The OpenAPI 3.1 description of the [Ricky](https://getricky.ai) REST API, its changelog, and runnable examples.

- **Guides and reference:** <https://getricky.ai/docs/api>
- **Specification:** [`openapi.json`](openapi.json), also served at <https://getricky.ai/openapi.json>
- **Changelog:** [`CHANGELOG.md`](CHANGELOG.md)

This repository is generated from the code that serves the API. The specification is never edited by hand, and every response the API sends is tested against it.

## At a glance

| | |
|---|---|
| Base URL | `https://getricky.ai/api/v1` |
| Authentication | `Authorization: Bearer rky_live_…`, one key per organization, scoped and expiring, created in **Settings → API** |
| Format | JSON, snake_case fields, UUID identifiers, ISO 8601 UTC timestamps |
| Lists | `{ "data": [...], "next_cursor": "…" }`; pass `next_cursor` back as `cursor` |
| Errors | `{ "error": { "code", "message", "param", "request_id" } }` with a stable `code` |
| Writes | Optional `Idempotency-Key` header; a retry with the same key replays the first response |
| Rate limit | 120 requests per minute per key, reported in `X-RateLimit-*` headers |
| Webhooks | Signed with HMAC-SHA256; up to ten delivery attempts |

## Quick start

List the channels the organization can send from:

```bash
curl https://getricky.ai/api/v1/channels \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

Send an approved WhatsApp template to a phone number. Ricky finds or creates the contact and its conversation, and answers `202` with the send it queued:

```bash
curl https://getricky.ai/api/v1/conversations \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: order-10482-ready" \
  -d '{
    "channel_id": "8f3c2a5e-6b1d-4c7a-9e2f-1a2b3c4d5e6f",
    "phone": "+50760001234",
    "template": {
      "id": "1234567890",
      "components": [
        { "type": "body", "parameters": [{ "type": "text", "text": "Ana" }] }
      ]
    }
  }'
```

Follow it until the provider accepts it:

```bash
curl https://getricky.ai/api/v1/sends/$SEND_ID \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

## SDKs

Official clients generated from this specification, published as `getricky` (source in [`sdks/`](sdks)):

```bash
npm install getricky   # TypeScript and JavaScript, Node.js 18 or later
pip install getricky   # Python 3.9 or later
```

```ts
import { Ricky } from 'getricky';

const ricky = new Ricky(process.env.RICKY_API_KEY);
const { data: channels } = await ricky.listChannels();
```

```python
from getricky import Ricky

ricky = Ricky()  # reads RICKY_API_KEY
channels = ricky.list_channels()["data"]
```

They add an `Idempotency-Key` to writes, retry rate limits and server errors, walk pages and verify webhooks. See [`sdks/typescript`](sdks/typescript) and [`sdks/python`](sdks/python), and [`sdks/README.md`](sdks/README.md) for how they are generated.

## Using the specification

The file also works with standard OpenAPI tooling, for example:

- TypeScript types: `npx openapi-typescript openapi.json -o ricky-api.d.ts`
- A client in another language: [OpenAPI Generator](https://openapi-generator.tech)
- Postman or Insomnia: import `openapi.json`

## Webhooks

[`examples/`](examples) holds complete receivers that verify the `X-Ricky-Signature` header, reject stale timestamps and deduplicate deliveries:

- [`verify-webhook.mjs`](examples/verify-webhook.mjs) for Node.js 18 or later
- [`verify_webhook.py`](examples/verify_webhook.py) for Python 3.9 or later

## Versioning

The version is part of the path (`/v1`). Additive changes ship at any time: new operations, new optional request fields, new response fields, new event types and new error codes. Write clients that ignore fields they do not know. A breaking change ships only in a new version and is announced in the changelog first.

## Support

Write to <ricardo@getricky.ai> and include the `X-Request-Id` of the request.

## License

The specification and the examples are available under the [MIT License](LICENSE).
