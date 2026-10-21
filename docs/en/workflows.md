# Workflows

URL: https://getricky.ai/en/docs/api/workflows

> Create, edit, activate and pause the organization's workflows, and review their executions.

A workflow is an automation Ricky runs on its own. The API manages the same workflows you see in Ricky, with the same rules as the editor.

The key needs the `workflows:read` scope to read and `workflows:write` to change anything.

## When a workflow runs

Ricky starts every execution from an event. There is no operation to start a workflow from your system.

| Type           | `trigger`                | Runs when                                                     |
| -------------- | ------------------------ | ------------------------------------------------------------- |
| `conversation` | `conversation_opened`    | A conversation opens on one of its channels.                  |
| `conversation` | `first_message_received` | The contact's first message in a conversation arrives.        |
| `scheduled`    | `{ "kind": "daily" }`    | Every day at a set time, with Odoo appointments or birthdays. |

The API creates and edits conversation workflows. Scheduled workflows are created in Ricky; the API reads, renames, activates, pauses and deletes them, sets their header file, and previews and reviews appointment reminders and their Odoo states ([below](#scheduled-workflows)).

A conversation workflow can have a `condition` so it runs only inside or outside business hours.

## Create a workflow

This workflow answers outside business hours, asks for the reason and assigns the conversation to a person or an AI agent.

```bash
curl https://getricky.ai/api/v1/workflows \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: workflow-after-hours" \
  -d '{
    "name": "After hours",
    "definition": {
      "trigger": "conversation_opened",
      "channel_ids": ["8f3c2a5e-6b1d-4c7a-9e2f-1a2b3c4d5e6f"],
      "condition": {
        "kind": "outside_business_hours",
        "business_hours": {
          "start": "09:00",
          "end": "18:00",
          "timezone": "America/Panama",
          "weekdays": [1, 2, 3, 4, 5]
        }
      },
      "flow": {
        "entry": "welcome",
        "steps": [
          { "id": "welcome", "kind": "send_message", "text": "Hi, we are open Monday to Friday, 9:00 to 18:00.", "next": "reason" },
          {
            "id": "reason",
            "kind": "ask_question",
            "text": "How can we help?",
            "answer_key": "reason",
            "choices": [
              { "id": "order", "label": "My order", "next": "advisor" },
              { "id": "other", "label": "Something else", "next": "agent" }
            ],
            "timeout_seconds": 3600,
            "on_timeout": "agent",
            "on_invalid": "agent",
            "next": "agent"
          },
          { "id": "advisor", "kind": "assign_user", "user_id": "2d4f6a8c-1b3d-4e5f-8a7b-9c0d1e2f3a4b", "next": null },
          { "id": "agent", "kind": "assign_agent", "agent_id": "7e8f9a0b-1c2d-4e3f-a4b5-c6d7e8f9a0b1", "next": null }
        ]
      }
    }
  }'
```

The response is `201` with the workflow in `status: "draft"`. A draft runs nothing.

Ricky checks the definition before storing it:

* Step IDs are unique and `entry` exists.
* Every `next`, `otherwise`, `on_timeout` and `on_invalid` points to an existing step, or is `null`.
* The flow has no loop without a question or a wait.
* Its channels, members and agents belong to the organization.
* Questions with buttons only go on WhatsApp channels.

When a check fails, the response is `400 invalid_input` with `param: "definition"` and the reason in `message`.

## Steps

| `kind`               | Does                                                                    | Fields                                                                          |
| -------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `send_message`       | Sends a text.                                                           | `text`                                                                          |
| `ask_question`       | Asks and waits for the answer. With `choices`, shows buttons or a list. | `text`, `answer_key`, `choices`, `timeout_seconds`, `on_timeout`, `on_invalid`  |
| `branch`             | Compares a stored answer and goes to `next` or `otherwise`.             | `answer_key`, `operator` (`equals`, `contains`, `exists`), `value`, `otherwise` |
| `wait`               | Waits before the next step, up to 7 days.                               | `seconds`                                                                       |
| `assign_user`        | Assigns the conversation to a member and ends the flow.                 | `user_id`                                                                       |
| `assign_agent`       | Puts an AI agent on the conversation and ends the flow.                 | `agent_id`                                                                      |
| `close_conversation` | Closes the conversation and ends the flow.                              |                                                                                 |
| `end`                | Ends the flow.                                                          |                                                                                 |

A workflow's messages are free-form text. So they only arrive inside the channel's reply window; on WhatsApp, 24 hours from the contact's last message.

## Activate and pause

```bash
curl -X POST https://getricky.ai/api/v1/workflows/$WORKFLOW_ID/activate \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

On activation, Ricky checks again what the workflow references. A workflow that assigns an AI agent needs an active subscription; without one, the response is `422 rule_violation`.

`POST /workflows/{workflow_id}/pause` stops new executions. Sends already queued still go out.

## Edit and delete

`PATCH /workflows/{workflow_id}` changes `name`, replaces the whole `definition`, or both. The status stays: an active workflow runs the new definition from its next execution.

`DELETE /workflows/{workflow_id}` deletes the workflow and answers it as it was.

## Review executions

```bash
curl "https://getricky.ai/api/v1/workflows/$WORKFLOW_ID/executions?page_size=20" \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

Each execution has its `status`, `attempts` and `last_error`. The status tells whether Ricky ran the workflow, not whether each message arrived. For that, read the conversation's messages or subscribe to `message.failed`. The list pages with `next_cursor`, as in [Pagination](./pagination.md).

## Scheduled workflows

A scheduled workflow sends a WhatsApp template every day from Odoo: appointment reminders or birthday greetings. It is set up in Ricky; with the API you can also set its header file and, for appointment reminders, see what it will send and what it sent.

### Header file

When the template has an image, video or document header, every send carries the file you store:

```bash
curl -X POST https://getricky.ai/api/v1/workflows/$WORKFLOW_ID/header-media \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: header-october" \
  -d '{ "url": "https://example.com/reminder.jpg" }'
```

Ricky downloads `url` as it does for [files you send](./sending-messages.md): public HTTPS, no redirects, and a `Content-Type` of the kind the header takes within WhatsApp's limit for it. The new file replaces the previous one. The answer is the workflow, with `has_header_image: true`. A template without a file header gets `422 rule_violation`; a file of another kind gets `400 invalid_input` with `param: "url"`. It requires `workflows:write`.

### Reminder preview

```bash
curl "https://getricky.ai/api/v1/workflows/$WORKFLOW_ID/reminders/preview?date=2026-10-20" \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

Ricky reads Odoo now and answers each appointment the workflow would remind on that day: `excluded_because` says why one is not sent (`state`, `name`, `branch`, `phone`), `message` is the text it would send, and `delivery` the send already recorded, if any. `date` is the day the workflow runs, its next run or later. `appointment_states=confirmed,pending` previews other Odoo states without saving them. It sends nothing. It needs Odoo connected; otherwise `422 rule_violation`.

### Reminder history

`GET /workflows/{workflow_id}/reminders/history?date=2026-10-14` answers what the workflow checked and sent on a past day, from what Ricky recorded: each appointment with its exclusion, the message, when it was queued and its delivery `status`. It does not read Odoo.

### Appointment states

`GET /workflows/{workflow_id}/reminders/state-options` reads from Odoo, now, every appointment state its installation has, each with its `value` and `label`: the values `source.appointment_states` and the preview's `appointment_states` take. It needs Odoo connected; otherwise `422 rule_violation`.

Preview, history and states are only for appointment reminder workflows; a birthday workflow gets `422 rule_violation`. All three require `workflows:read`.

## Example: order ready with a reminder

You want this: when an order is ready, the customer gets a template. If they have not picked it up in 3 days, they get a reminder.

A workflow cannot do it. Ricky does not start a workflow from your system, and its steps neither send templates nor check tags. Do it with the API from your system:

1. **Send the template.** Call `POST /conversations` with the phone and the `pedido_listo` template. Use `Idempotency-Key: order-10482-ready`. Keep the `conversation_id` of the response. See [Sending messages](./sending-messages.md).
2. **Schedule the check.** In your system, schedule a job 3 days later with the order number and the `conversation_id`.
3. **Check the tag.** When the job runs, read the conversation with `GET /conversations/{conversation_id}` to get `contact.id`. Then read the contact with `GET /contacts/{contact_id}` and look for the `retirado` tag in `tags`. Your team applies it in Ricky when the customer picks up; your system can also apply it with `PATCH /contacts/{contact_id}` and `tag_ids`.
4. **Send the reminder.** If the tag is missing, call `POST /conversations/{conversation_id}/messages` with `type: "template"` and the `pedido_recordatorio` template. Use `Idempotency-Key: order-10482-reminder`, so a retry does not send it twice.

A template can be sent at any time, even when the reply window is closed.
