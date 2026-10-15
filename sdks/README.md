# SDKs

Official clients for the Ricky API, generated from [`openapi.json`](../openapi.json) with a thin hand-written layer on top.

| Language | Package | Directory |
|---|---|---|
| TypeScript and JavaScript (Node.js 18+) | [`getricky` on npm](https://www.npmjs.com/package/getricky) | [`typescript/`](typescript) |
| Python 3.9+ | [`getricky` on PyPI](https://pypi.org/project/getricky/) | [`python/`](python) |

Both behave the same way:

- A client built from an API key (or `RICKY_API_KEY`) and an optional base URL.
- One method per operation, named after its `operationId`, returning the response body as the API sends it (`{ data }`, `{ data, next_cursor }`).
- Writes that accept an `Idempotency-Key` get a random one unless the caller passes one.
- Reads, and writes that carry a key, retry on connection errors, `429` and `5xx`, honoring `Retry-After`; other writes never retry.
- Errors raise a typed error with `code`, `status`, `param` and the request ID.
- A pagination helper over items or whole pages.
- `verifyWebhook` / `verify_webhook`: checks the signature (any of the comma-separated `v1=` values, so a secret rotation verifies with either secret) and the five-minute timestamp tolerance, and returns the event. Unknown event types pass through.

## How they are made

Files under `typescript/src/generated/`, `python/src/getricky/types.py` and `python/src/getricky/_operations.py` are generated and never edited by hand. Everything else is written by hand. In the Ricky monorepo, `pnpm ricky api sdks` regenerates both from `apps/web/public/openapi.json` (`--test` also builds and tests them), and `pnpm ricky api publish` refuses to publish when regenerating changes them. In this repository:

```bash
cd typescript && npm ci && npm run generate && npm test
cd python && uv run --no-project --python 3.12 --with datamodel-code-generator==0.83.0 python scripts/generate.py
```

[`webhook-vectors.json`](webhook-vectors.json) holds a delivery body and signatures produced by the server's own signing code; both SDKs' tests verify against it, and a test in the monorepo fails if the server stops producing it.

## Generator choices

Chosen on 2026-10-15 for: idiomatic output, typed models, few runtime dependencies, OpenAPI 3.1, and the discriminated unions in the spec (`SendMessage` is a `oneOf` on `type`). Weekly downloads are from the npm and PyPI download APIs for the week before.

### TypeScript: `@hey-api/openapi-ts` 0.99.0

Pinned in `typescript/package.json` and its lockfile, run with TypeScript 6.0.3: with TypeScript 7.0.2 it crashes reading `ts.SyntaxKind`.

- Generates a typed method per operation on one class, types for every schema, and `oneOf` as a TypeScript union, so `body: { type: 'text', text }` is checked against the right variant.
- Emits its fetch client into the output, so the package has no runtime dependencies.
- Types only, no runtime validation: fields and enum values the API adds later reach callers instead of failing.
- 5.4 million weekly downloads; 0.99.0 is the latest stable release (2026-06-22).

Considered: `openapi-typescript` with `openapi-fetch` (9.5 and 11.0 million weekly downloads) types every path well, but calls go through `client.GET("/contacts")` rather than one method per operation, and `openapi-fetch` becomes a runtime dependency. `orval` (2.5 million; used in this monorepo for vendor types, Zod schemas and MSW mocks) was not tried for the SDK: hey-api already met every criterion, with its bundled client (no runtime dependency) and a single SDK class. `openapi-generator` (1.4 million for its npm wrapper) needs a Java 11 runtime to run.

### Python: `datamodel-code-generator` 0.83.0 (2026-09-24), plus `scripts/generate.py`

- `datamodel-code-generator` (3.3 million weekly downloads) turns every schema into a `TypedDict`, with `Literal` for enums and constants and a `Union` for each `oneOf`. Responses stay plain dicts: type checkers see every field, and nothing fails at runtime when the API adds a field, an enum value or an event type. Runtime dependencies are only `httpx` and `typing-extensions`.
- `scripts/generate.py` (standard library only) titles each `oneOf` variant after its `type` constant (`SendMessageText`, `SendMessageTemplate`, `SendMessageMedia`) and writes one typed method per operation, sync and async, on top of the hand-written `httpx` client.

Considered: `openapi-python-client` 0.29.1 (0.9 million weekly downloads), tried on this spec. It is idiomatic and uses `httpx`, but its output needs Python 3.11 (`StrEnum`), parses enums into `Enum` classes, so a status or event type the API adds later raises on parse, and names the `SendMessage` variants `SendMessageType0`, `SendMessageType1`, `SendMessageType2`. `openapi-generator`'s Python client (0.2 million weekly downloads for its PyPI wrapper) needs a Java 11 runtime and defaults to `urllib3`, with `httpx` as an option; not tried here.
