# Errors

URL: https://getricky.ai/en/docs/api/errors

> The shape of error responses and the code catalog.

Every response with a non-2xx status has the same body:

```json title="400 Bad Request"
{
  "error": {
    "code": "invalid_input",
    "message": "primary_email: Invalid email address",
    "param": "primary_email",
    "request_id": "7c1e9a3b-5d2f-4e8a-b6c0-1f3d5a7b9e2c"
  }
}
```

| Field        | Description                                                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `code`       | Stable, machine-readable code. Base your logic on it.                                                                                                        |
| `message`    | Explanation for people. It may change: do not parse it.                                                                                                      |
| `param`      | The field or parameter that caused the error, when known: `phone`, `template.components.0.parameters.0.text`, `cursor`, `Idempotency-Key`. It may be absent. |
| `request_id` | Request identifier. It also arrives in the `X-Request-Id` header.                                                                                            |

Every response, successful or not, includes `X-Request-Id`. Keep it in your logs and include it when you contact support.

## Codes

The table is generated from the API contract. Each reference page lists the codes that operation can answer.

| Code | HTTP | Meaning |
| --- | --- | --- |
| `invalid_input` | 400 | A parameter or body field is invalid; `param` names it when known. |
| `invalid_json` | 400 | The body is not valid JSON. |
| `unauthorized` | 401 | The `Authorization` header is missing, malformed, expired or revoked. |
| `insufficient_scope` | 403 | The key lacks the scope this operation requires. |
| `forbidden` | 403 | The organization does not allow the operation. |
| `not_found` | 404 | The resource does not exist in this organization. |
| `conflict` | 409 | The resource changed in a way that prevents the operation. |
| `idempotency_conflict` | 409 | The `Idempotency-Key` was used for a different request. |
| `request_processing` | 409 | A request with this `Idempotency-Key` is still processing or ended in an unknown state. |
| `body_too_large` | 413 | The JSON body exceeds 64 KiB. |
| `unsupported_media_type` | 415 | The body must be `application/json`. |
| `outside_messaging_window` | 422 | The channel only allows free-form text inside its reply window; send a template. |
| `rule_violation` | 422 | The request breaks a business rule; `message` says which. |
| `rate_limited` | 429 | More than 120 requests this minute with this key; see `Retry-After`. |
| `internal_error` | 500 | Ricky failed. Retry a read. Before retrying a write, read the resource: the same `Idempotency-Key` answers `request_processing`. |
| `upstream_error` | 502 | The messaging provider failed. Retry later. |
| `unavailable` | 503 | A dependency is temporarily unavailable. Retry later. |

## Handling them

* Decide by `code`. If you receive a code you do not know, decide by the HTTP status.
* A `4xx` means a problem with the request. Do not repeat it unchanged, except `409 request_processing` and `429 rate_limited`.
* A `5xx` means Ricky or the provider failed. Before repeating a write, read [Idempotency, rate limits and retries](./idempotency-and-rate-limits.md).
* Validation stops at the first problem. After you fix one field, another one may fail.
