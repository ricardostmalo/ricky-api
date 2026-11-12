# Ad attribution

URL: https://getricky.ai/en/docs/api/ad-attribution

> Which Meta ad each conversation, message and contact came from, the conversations of an ad, and what happened after.

When someone writes from a Click to WhatsApp, Instagram or Messenger ad, Meta sends the ad's ID with their message. Ricky keeps it, and the API answers it on the message, on the conversation and on the contact, filters lists by it, and lists the conversations each ad brought.

| Task                                       | Operation                                                            | Scope                |
| ------------------------------------------ | -------------------------------------------------------------------- | -------------------- |
| The ad a conversation came from            | `GET /conversations/{id}`: `first_ad_referral`, `latest_ad_referral` | `conversations:read` |
| The ad a message came from                 | `GET /conversations/{id}/messages`: `ad_referral`                    | `conversations:read` |
| A contact's first and last touch           | `GET /contacts/{id}`: `first_ad_referral`, `last_ad_referral`        | `contacts:read`      |
| Conversations or contacts of an ad         | `GET /conversations?ad_id=…`, `GET /contacts?ad_id=…`                | as each list         |
| Every conversation ads brought in a period | `GET /ads/conversations`                                             | `conversations:read` |
| Spend, clicks and Meta's results per ad    | `GET /ads/insights?level=ad`                                         | `reports:read`       |
| Know at once that someone wrote from an ad | Webhook `message.received` with `data.ad_id`                         | `webhooks:manage`    |

## When a message comes from an ad

A message comes from an ad when it is a customer message whose Meta referral names an ad: WhatsApp's `referral.source_id` with `source_type: "ad"`, or Instagram's and Messenger's `referral.ad_id` with `source: "ADS"`. It is the same definition as `GET /reports/ads` and the Ads page. A referral from an organic post (`source_type: "post"`) is not an ad.

A conversation keeps its first and its latest ad: someone who wrote from one ad in March and came back from another in October has both. A contact keeps them across all its conversations and channels: `first_ad_referral` is the first touch and `last_ad_referral` the last touch. Every other message, conversation or contact answers `null`.

## The referral

```json
{
  "ad_id": "120210000000000001",
  "channel": "whatsapp",
  "message_id": "c41d7e2a-5b6f-4a89-8c3d-0e1f2a3b4c5d",
  "conversation_id": "9b2e4c61-7a3f-4d18-b5c2-6e0f1a2b3c4d",
  "contact_id": "3f6c2b1e-8d4a-4b7e-9a51-2c7d8e9f0a1b",
  "referred_at": "2026-10-14T15:30:00.000Z",
  "source_type": "ad",
  "source_url": "https://fb.me/2ZBx1WlQe",
  "headline": "Implantes dentales en un día",
  "body": "Agenda tu evaluación sin costo.",
  "media_type": "video",
  "image_url": "https://…/ad-referral-images/…/thumbnail.jpg",
  "video_url": "https://…",
  "ctwa_clid": "ARAkLkA8rmlFeiCktEJQ…",
  "ref": null,
  "resolved": {
    "ad_name": "Implantes - video octubre",
    "campaign_id": "120210000000000003",
    "campaign_name": "Implantes dentales",
    "ad_set_id": "120210000000000002",
    "ad_set_name": "Panamá 30-55",
    "ad_account_id": "1234567890",
    "synced_at": "2026-10-14T06:00:00.000Z"
  }
}
```

Every field except `resolved` is what Meta sent in the message, or Ricky's record of it: which message, conversation, contact and channel, and when the customer wrote. WhatsApp sends the most (`source_url`, `body`, `media_type`, `ctwa_clid`); Instagram and Messenger send the ad ID, its title and its media, and `ref` when the ad link has one. A field Meta did not send is `null`. `image_url` is Ricky's permanent copy of the image Meta sent, or Meta's link while it has not expired.

`resolved` is not in the message. It is the ad as Ricky last synced it from the organization's connected Meta ad account: its name, campaign and ad set. It is `null` when Meta Ads is not connected, or when the ad belongs to an ad account Ricky does not sync. `GET /ads/ads` reads the same ad live from Meta.

`ad_id` is the same ID as `ad_id` in `GET /ads/insights?level=ad` and `id` in `GET /ads/ads`, so you can join conversations with spend.

## Filter lists by ad

`GET /conversations` and `GET /contacts` take these filters, alone or together, and with the list's other filters:

| Parameter         | Keeps the conversations or contacts with a customer message |
| ----------------- | ----------------------------------------------------------- |
| `ad_id`           | from that ad                                                |
| `campaign_id`     | from an ad of that campaign                                 |
| `ad_set_id`       | from an ad of that ad set                                   |
| `referred_after`  | from an ad, sent at or after that time (ISO 8601)           |
| `referred_before` | from an ad, sent before that time                           |

They apply to one message together: `ad_id=…&referred_after=2026-10-01T00:00:00-05:00` keeps conversations where that ad brought someone since October 1, not conversations that had that ad at any time and any ad since then. `campaign_id` and `ad_set_id` match the ads Ricky synced from a connected ad account; without the connection they keep nothing.

`GET /conversations` also takes `last_activity_after` and `last_activity_before`, by the time of the latest message.

## The conversations ads brought

`GET /ads/conversations` answers each conversation an ad opened or brought back in a period, newest first, with the contact, the conversation's state and the replies it got:

```bash
curl "https://getricky.ai/api/v1/ads/conversations?from=2026-10-01&to=2026-10-31&campaign_id=120210000000000003" \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

```json
{
  "data": [
    {
      "ad_referral": { "ad_id": "120210000000000001", "headline": "Implantes dentales en un día", "resolved": { "campaign_name": "Implantes dentales" } },
      "opened_conversation": true,
      "message_text": "Hola, quiero más información sobre los implantes.",
      "contact": { "id": "3f6c2b1e-…", "name": "Ana Pérez", "phone": "+50760001234", "external_id": "50760001234" },
      "conversation": { "id": "9b2e4c61-…", "status": "closed", "close_category": "sale", "closed_at": "2026-10-15T18:00:00.000Z", "created_at": "2026-10-14T15:30:00.000Z" },
      "customer_messages": 9,
      "replies": 7,
      "first_reply_seconds": 42
    }
  ],
  "next_cursor": null
}
```

The example is shortened; `ad_referral` carries every field above.

* `from` and `to` are America/Panama days, both inclusive, as in the [reports](./reports.md#the-period): both or neither (the last 7 days), at most 366 days. It filters by when the customer wrote from the ad.
* One row per conversation and ad: the first message from that ad in that conversation within the period. A conversation two ads brought back has two rows, so per ad these rows add up to the conversations of `GET /reports/ads`.
* `opened_conversation` is `true` when that message started the conversation, `false` when the ad brought back someone who had written before.
* `customer_messages` and `replies` count from that message to now. A reply is written by a member, an AI agent or someone in the channel's own app; automations, broadcasts, templates and reactions are not replies. `first_reply_seconds` is the wait until the first one, `null` while unanswered.
* It takes `ad_id`, `campaign_id`, `ad_set_id` and `channel`, and pages with `page_size` (up to 100) and `cursor`.

It reads the messages Ricky received, so it works without connecting Meta Ads; only `resolved` needs the connection.

## Sales and appointments

Ricky records a sale only when a member closes the conversation as a sale: `close_category: "sale"` on the conversation. It records no amount, product or payment, and it does not know about sales made outside the chat. To report revenue per ad, join the contact's `phone` or `external_id` with your sales or appointment system, then group by `ad_id` or `resolved.campaign_id`.

## Recipe: an ads report

1. `GET /ads/conversations?from=…&to=…` and follow `next_cursor`: who came from which ad, whether they were new, what they wrote first, how fast they were answered and how the conversation ended.
2. For what they asked after the first message, `GET /conversations/{conversation_id}/messages` for the rows you need.
3. `GET /ads/insights?level=ad&from=…&to=…` for spend, impressions and clicks per `ad_id`. Meta's days are the ad account's time zone; Ricky's are America/Panama.
4. Join on `ad_id`: cost per conversation, conversations per campaign, sales per campaign where `close_category` is `sale`.

To be told as it happens, subscribe a [webhook](./webhooks.md) to `message.received`: when the message came from an ad, `data.ad_id` names it.

## A key for an agency

Only an owner or admin of the organization creates keys. For an agency that builds reports, create one in **Settings → API** with **View only** for every resource and an expiry: it can read conversations, contacts, reports and Meta Ads, and cannot send, edit or delete anything. The key belongs to the organization: revoke it in **Settings → API** when the agency stops working with you. See [Authentication](./authentication.md).

A key makes 120 requests per minute. `GET /ads/conversations` answers up to 100 conversations per request, so read it first and fetch messages only for the conversations you need.
