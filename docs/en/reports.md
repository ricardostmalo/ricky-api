# Reports

URL: https://getricky.ai/en/docs/api/reports

> Read the numbers of the Reports pages for a period, with the same filters.

Each report operation answers the numbers of one tab of **Reports** in Ricky. The API reads the same data with the same definitions, so for the same period and filters it shows what the page shows. The key needs the `reports:read` scope.

| Operation                    | Tab           | Filters                              | What it answers                                                                    |
| ---------------------------- | ------------- | ------------------------------------ | ---------------------------------------------------------------------------------- |
| `GET /reports/dashboard`     | Now           | None: it is now                      | Open conversations, who holds them and who waits for a reply.                      |
| `GET /reports/conversations` | Conversations | `from`, `to`, `channel`              | Customers who wrote, new or returning, per channel, day and hour.                  |
| `GET /reports/messages`      | Messages      | `from`, `to`, `channel`              | Messages received and sent, and who sent them.                                     |
| `GET /reports/responses`     | Responses     | `from`, `to`, `channel`, `responder` | Response times and responses per conversation.                                     |
| `GET /reports/resolutions`   | Resolutions   | `from`, `to`, `channel`              | Closes and how long conversations were open.                                       |
| `GET /reports/team`          | Team          | `from`, `to`, `channel`              | Assignments, messages, closes (by who closed) and medians per member and AI agent. |
| `GET /reports/broadcasts`    | Broadcasts    | `from`, `to`                         | WhatsApp broadcasts and their recipients' outcomes.                                |
| `GET /reports/ads`           | Ads           | `from`, `to`                         | Meta ad spend next to the conversations each ad brought.                           |

## The period

* `from` and `to` are days, `YYYY-MM-DD`, both inclusive. Send both or neither. Without them the report covers the last 7 days, today included.
* Days are **America/Panama** time, like the Reports pages. A message sent at 23:30 in Panama counts on that day.
* A `to` after today counts as today. `from` cannot be after today, nor after `to`, and a period has at most 366 days. Otherwise the answer is `400 invalid_input`.
* `period` in the answer repeats the days the report covers and names the previous period: the same number of days, right before. Every `previous` number is that period.
* `series` has one entry per day. For a one-day period it has 24, one per hour, and `period.granularity` is `hour`.

Durations are in seconds. Times such as `generated_at` are ISO 8601 in UTC.

## Read a report

```bash
curl "https://getricky.ai/api/v1/reports/responses?from=2026-10-01&to=2026-10-14&channel=whatsapp" \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

```json
{
  "data": {
    "period": {
      "from": "2026-10-01",
      "to": "2026-10-14",
      "days": 14,
      "granularity": "day",
      "time_zone": "America/Panama",
      "previous_from": "2026-09-17",
      "previous_to": "2026-09-30"
    },
    "channel": "whatsapp",
    "responder": "all",
    "awaiting_reply_now": 3,
    "response_time": {
      "responses": 412,
      "average_seconds": 184.2,
      "median_seconds": 41,
      "p90_seconds": 520,
      "previous_average_seconds": 201.7,
      "buckets": [{ "bucket": "under_30s", "count": 170, "share": 0.41 }],
      "series": [
        {
          "slot": "2026-10-01",
          "average_seconds": 150.3,
          "median_seconds": 38,
          "previous_average_seconds": 210.1,
          "previous_median_seconds": 45
        }
      ]
    },
    "generated_at": "2026-10-14T15:30:00.000Z"
  }
}
```

The example is shortened. The [reference](https://getricky.ai/en/docs/api/reference/reports/get-responses-report) lists every field and defines what each one counts.

## Meta Ads, live

The ads report counts the conversations each ad brought into Ricky. To see the ad accounts themselves, four operations read the organization's connected Meta ad accounts live from Meta. They only read: nothing changes in Meta. They need `reports:read`, and answer `422 rule_violation` while Meta Ads is not connected and `403 forbidden` when Meta no longer accepts the connection.

| Operation            | What it answers                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| `GET /ads/campaigns` | Campaigns: objective, status, delivery status, budget and schedule.                                       |
| `GET /ads/ad-sets`   | Ad sets: optimization goal, budget, schedule and Meta's targeting.                                        |
| `GET /ads/ads`       | Ads with their creative: text, headline, button and image.                                                |
| `GET /ads/insights`  | Spend, impressions, reach, clicks, CTR, CPC, CPM and Meta's actions, per account, campaign, ad set or ad. |

* `account_id` reads one connected ad account; without it every connected account is read. `active_only=true` keeps what Meta is delivering now.
* Budgets are in the ad account's currency. A daily or lifetime budget the object does not use is `null`.
* `/ads/insights` takes `from` and `to` in the ad account's time zone (at most 400 days), `level`, up to two `breakdowns` such as `age,gender`, and `daily=true` for one row per day.

## Definitions

* **Customer** (conversations report): a conversation with at least one customer message in the period. It is new when its first message ever falls in the period.
* **Response** (responses report): the same as in Atención and Equipo. It answers a customer message, or several in a row (reactions aside): the first message after them sent by a person in Ricky, an AI agent or a person in the channel's own app. Its time is the wait since the first of those messages. Follow-ups, automations, broadcasts and templates are not responses. `responder=humans` covers people in Ricky and in the channel's own app; `responder=agents`, the AI agents; a member or AI agent ID, only them.
* **Resolution** (resolutions report): each close in the period, from the opening of that span to the close.
* **Ads**: a conversation comes from an ad when a customer message carries a Meta referral that names the ad, the same in Demanda, Atención and Anuncios. Spend comes from Meta for the ad account's own days, so a period's edges can differ by the time zones' offset.

Reports are computed when you call them. The Reports pages keep each result for a few minutes, so a page opened earlier can show slightly older numbers.
