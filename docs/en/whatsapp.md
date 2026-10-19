# WhatsApp templates and numbers

URL: https://getricky.ai/en/docs/api/whatsapp

> Create, validate, edit and delete WhatsApp templates, follow Meta's review and read the status of your numbers.

Templates are the messages Meta approves for writing to a customer outside the 24-hour window. The API uses the same rules as Ricky's template editor and reads each template live from Meta.

The key needs `templates:read` to read and validate, and `templates:write` to create, edit or delete. WhatsApp numbers are read with `conversations:read`.

## Validate a draft

`POST /templates/validate` checks a draft without sending it to Meta. Use it before creating a template.

```bash
curl https://getricky.ai/api/v1/templates/validate \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel_id": "8f3c2a5e-6b1d-4c7a-9e2f-1a2b3c4d5e6f",
    "name": "order_ready",
    "language": "en_US",
    "category": "UTILITY",
    "parameter_format": "POSITIONAL",
    "body": {
      "text": "Hi {{1}}, your order {{2}} is ready for pickup.",
      "examples": { "1": "Ana", "2": "10482" }
    },
    "footer": "Casa Nativa",
    "buttons": [{ "type": "QUICK_REPLY", "text": "Thanks" }]
  }'
```

The response is `200`. A good draft answers `valid: true` and the `components` Ricky would send to Meta. Otherwise it answers `valid: false` and, in `errors`, each problem with its field (`param`) and what to change (`message`).

A body that is not a draft, for example without `body`, gets `400 invalid_input`. Meta can still reject a valid draft in its review.

## Create a template

`POST /templates` takes the same body, with `channel_id` required: the template belongs to that number's business account. Send an `Idempotency-Key` so a retry does not submit it twice.

* `parameter_format`: `NAMED` (`{{name}}`) or `POSITIONAL` (`{{1}}`). It cannot change later.
* `header`: `TEXT` or `LOCATION`, or `null`.
* `body.examples`: one example per variable. Meta reviews them.
* `buttons`: quick replies, up to two links and one phone.

The response is `201` with the template, usually in `status: "PENDING"`. A draft that breaks a rule gets `400 invalid_input` with the first problem. If Meta refuses it, the response is `422 rule_violation` with its reason.

## Follow Meta's review

`GET /templates/{template_id}` reads the template from Meta. Its `status` is `PENDING` while Meta reviews it, then `APPROVED`, `REJECTED` or `PAUSED`. Only an `APPROVED` template can be sent. See [Sending messages](./sending-messages.md).

`GET /templates` lists the templates of all your business accounts.

## Edit and delete

`PATCH /templates/{template_id}` changes only what you send: `category`, `header`, `body`, `footer` or `buttons` (which replaces every button). Name, language and `parameter_format` do not change. Ricky sends the edited template to review again.

Meta allows edits only for `APPROVED`, `REJECTED` or `PAUSED` templates, and limits how often an approved one changes. When it does not allow the edit, the response is `422 rule_violation`. Templates with an image, video or document header, or with buttons Ricky's editor does not build, cannot be edited through the API.

`DELETE /templates/{template_id}` deletes the template at Meta. Meta deletes it in every language with that name, and the name cannot be used again for 30 days.

## WhatsApp numbers

`GET /whatsapp-numbers` lists the organization's numbers, disconnected ones included. `GET /whatsapp-numbers/{channel_id}` reads one.

Each number carries what Ricky's WhatsApp settings show:

| Field              | What it is                                                          |
| ------------------ | ------------------------------------------------------------------- |
| `status`           | The number's status at Meta, for example `CONNECTED`.               |
| `messaging_health` | Whether Meta lets it send: `available`, `limited` or `blocked`.     |
| `quality_rating`   | Quality at Meta: `GREEN`, `YELLOW`, `RED` or `UNKNOWN`.             |
| `messaging_limit`  | Messaging limit at Meta, for example `TIER_1K` or `TIER_UNLIMITED`. |
| `last_synced_at`   | When Ricky last read these details from Meta.                       |
