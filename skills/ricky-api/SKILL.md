---
name: ricky-api
description: Call the Ricky REST API (getricky.ai/api/v1) to read and act on one organization's WhatsApp, Instagram and Messenger conversations, contacts, messages, templates, broadcasts, workflows, AI agents, reports and Meta Ads, and to receive its webhooks. Use when writing code or scripts against the Ricky API or its getricky SDKs, when building a report from Ricky data (for example which Meta ad each chat came from, what the customer asked, and how it ended), or when verifying a Ricky webhook.
---

# Ricky API

Ricky is a customer-conversation platform: a shared inbox for WhatsApp, Instagram, Messenger and web chat, contacts, broadcasts, workflows and AI agents. Its REST API reads and changes one organization's data with an API key.

- Guides: <https://getricky.ai/en/docs/api> (Spanish at <https://getricky.ai/docs/api>); every guide is also Markdown at the same URL plus `.md`, and <https://getricky.ai/en/llms.txt> lists them.
- OpenAPI 3.1: <https://getricky.ai/openapi.json>. It is generated from the code that serves the API and is the source of truth for every path, parameter, field and error code. Read the operation there before you call it.
- SDKs: `npm install getricky` (Node.js 18+) and `pip install getricky` (Python 3.9+).

## Authenticate

An owner or admin of the organization creates the key in Ricky under **Settings → API**, chooses its access per resource and an expiry, and copies it. The key has the form `rky_live_` followed by 43 characters. Keep it in an environment variable (`RICKY_API_KEY`) or a secret manager; never put it in a browser, a mobile app, a URL, a log or a commit.

```bash
curl https://getricky.ai/api/v1/members -H "Authorization: Bearer $RICKY_API_KEY"
```

Each operation needs one scope (`contacts:read`, `conversations:read`, `messages:send`, `reports:read`, …). A missing scope answers `403 insufficient_scope`: ask the organization's admin to add it to the key in **Settings → API**; the key itself does not change. For reports and analysis, a key with **View only** on every resource is enough and cannot change anything.

## Conventions

- Base URL `https://getricky.ai/api/v1`. JSON with snake_case fields, UUID IDs (Meta template, ad, campaign and ad set IDs are Meta's numeric strings), ISO 8601 UTC times.
- One resource is `{ "data": {...} }`. A list is `{ "data": [...], "next_cursor": "…" }`: pass `next_cursor` back as `cursor`, unchanged, with the same filters, until it is `null`. `page_size` goes up to 100.
- Errors are `{ "error": { "code", "message", "param", "request_id" } }`. Branch on `code`, never on `message`. Quote `request_id` (also the `X-Request-Id` header) when asking Ricky for help.
- Writes accept an `Idempotency-Key` header; a retry with the same key replays the first answer instead of acting twice. Always send one on writes your code may retry.
- 120 requests per minute per key, reported in `X-RateLimit-*`. On `429`, wait for `Retry-After`. The SDKs retry reads and keyed writes for you.
- Report periods (`from`, `to`) are inclusive `YYYY-MM-DD` days in America/Panama, both or neither (the last 7 days), at most 366 days. Meta's own figures (`/ads/insights`) use the ad account's time zone.
- Responses may gain fields at any time: ignore fields you do not know.

## SDKs

```ts
import { Ricky } from 'getricky';
const ricky = new Ricky(); // reads RICKY_API_KEY

for await (const conversation of ricky.paginate(ricky.listConversations, {
  query: { ad_id: '120210000000000001' },
})) {
  console.log(conversation.id, conversation.first_ad_referral?.headline);
}
```

```python
from getricky import Ricky
ricky = Ricky()
for row in ricky.paginate(ricky.list_ad_conversations, from_="2026-10-01", to="2026-10-31"):
    print(row["ad_referral"]["ad_id"], row["contact"]["name"], row["conversation"]["close_category"])
```

Every operation is a method named after its `operationId`: camelCase in TypeScript, taking one `{ path, query, body, headers }` object; snake_case in Python, taking path parameters first and query parameters as keywords (`from` is `from_`). Errors raise `RickyError` with `code`, `status`, `param` and the request ID.

## Recipes

### Which Meta ad each chat came from

A conversation answers `first_ad_referral` and `latest_ad_referral`, a message `ad_referral`, and a contact `first_ad_referral` (first touch) and `last_ad_referral` (last touch); `null` when no ad was involved. Each `AdReferral` carries:

- What Meta sent with the message: `ad_id`, `source_type`, `source_url`, `headline`, `body`, `media_type`, `image_url`, `video_url`, `ctwa_clid` (WhatsApp), `ref` (Instagram and Messenger).
- Ricky's record of it: `channel`, `message_id`, `conversation_id`, `contact_id`, `referred_at`.
- `resolved`: the ad's name, campaign and ad set from Ricky's sync of the connected Meta ad account, or `null` when the ad is not synced. It is Ricky's lookup, not part of Meta's message; present it as such.

Filter lists with `ad_id`, `campaign_id`, `ad_set_id`, `referred_after`, `referred_before` on `GET /conversations` and `GET /contacts`. They apply together to one message.

### An ads report: who came from which ad, what they asked, how it ended

1. `GET /ads/conversations?from=YYYY-MM-DD&to=YYYY-MM-DD` (scope `conversations:read`), following `next_cursor`. One row per conversation and ad with `ad_referral`, `opened_conversation` (new or returning), `message_text` (their first message), `contact` (`name`, `phone`, `external_id`), `conversation` (`status`, `close_category`), `customer_messages`, `replies` and `first_reply_seconds`. Narrow it with `ad_id`, `campaign_id`, `ad_set_id` or `channel`.
2. `GET /conversations/{conversation_id}/messages` for the full chat of the rows you need. Read only what you need: 120 requests per minute.
3. `GET /ads/insights?level=ad&from=…&to=…` (scope `reports:read`) for spend, impressions, clicks and Meta's actions per `ad_id`. `GET /ads/ads` and `GET /ads/campaigns` describe the ads and campaigns live from Meta.
4. Join on `ad_id` and compute what the report asks: conversations and cost per conversation per ad or campaign, share of new contacts, reply time.

Say exactly what the data is. Ricky records a sale only as `close_category: "sale"`, set when a member closes the conversation as a sale; it has no amount, product or payment. Revenue per ad needs the business's own sales or appointment data, joined by the contact's phone. `GET /reports/ads` gives the same per-ad conversation counts as the Ads page.

### React when someone writes from an ad

Subscribe a webhook (`POST /webhooks`, scope `webhooks:manage`) to `message.received`. Its `data` carries `conversation_id`, `message_id`, and `ad_id` when the message came from an ad. Verify `X-Ricky-Signature` (HMAC-SHA256, possibly two comma-separated `v1=` values during a secret rotation) with the SDK's `verifyWebhook` / `verify_webhook`, reject timestamps older than five minutes, deduplicate by the event `id`, then read the message for the rest of the referral.

### Send a WhatsApp template

`POST /conversations` with `channel_id`, `phone` and an approved `template` (scope `messages:send`) finds or creates the contact and its conversation and answers `202` with a `Send`; poll `GET /sends/{send_id}` until `sent` or `failed`. Outside WhatsApp's 24-hour window only templates can be sent (`outside_messaging_window`).

## Before you finish

- Check every call against `openapi.json`; do not guess a field or a filter.
- Never print or commit the key. Use the narrowest scopes the task needs.
- Report numbers with their definition and period (Panama days for Ricky, the ad account's days for Meta).
