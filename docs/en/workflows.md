# Workflows

URL: https://getricky.ai/en/docs/api/workflows

> Create, edit, activate and pause the organization's workflows, and review their executions.

A workflow is an automation Ricky runs on its own. The API manages the same workflows you see in Ricky, with the same rules as the editor.

The key needs the `workflows:read` scope to read and `workflows:write` to change anything.

## When a workflow runs

Ricky starts every execution from an event. There is no operation to start a workflow from your system.

A conversation workflow has three parts:

* `trigger`: the event that starts it.
* `condition`: the yes-or-no question that decides whether that occurrence of the event runs it ([Conditions](#conditions)). With `null`, it runs on every occurrence and on every channel, including channels you connect later.
* `flow`: the steps it follows ([Steps](#steps)).

| Type           | `trigger`                 | Runs when                                                                                                                                          |
| -------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `conversation` | `conversation_opened`     | A conversation starts, or reopens with a message from the contact.                                                                                 |
| `conversation` | `first_message_received`  | The contact writes first in a conversation, before any message from the business.                                                                  |
| `conversation` | `message_received`        | Any message from the contact arrives.                                                                                                              |
| `conversation` | `message_sent`            | A message from the business goes out. It runs within 15 minutes, unless the contact replied first.                                                 |
| `conversation` | `call_received`           | A WhatsApp call comes in. The workflow decides who answers.                                                                                        |
| `conversation` | `team_message_unanswered` | `inactivity_seconds` passes without a reply from the contact to the last team message.                                                             |
| `conversation` | `conversation_inactive`   | `inactivity_seconds` passes without messages or reactions from either side.                                                                        |
| `conversation` | `conversation_assigned`   | A conversation is assigned to a member. The assignment an AI agent's handoff makes does not run it.                                                |
| `conversation` | `schedule`                | One of the times in `schedule` arrives. It runs on each conversation assigned then to the members its `condition` names ([Scheduled](#scheduled)). |
| `scheduled`    | `{ "kind": "daily" }`     | Every day at a set time, with Odoo appointments or birthdays.                                                                                      |

`inactivity_seconds` goes from 60 to 31536000 seconds. It is required on `team_message_unanswered` and `conversation_inactive`, and only they take it.

The API creates and edits conversation workflows. Scheduled workflows are created in Ricky; the API reads, renames, activates, pauses and deletes them, sets their header file, and previews and reviews appointment reminders and their Odoo states ([below](#scheduled-workflows)).

A conversation workflow can contain a WhatsApp template step (`send_whatsapp_template`). The workflow read endpoints return its template and whether it has a header image. The complete-definition POST and PATCH endpoints reject this step. The existing MCP tools accept the header value they return in `headerMedia.storagePath` as an opaque reference. Pass it back unchanged when editing a canvas workflow.

## Conditions

`condition` is a yes-or-no question. It takes one of two forms:

* **Comparison**: `{ "kind": "compare", "field": "…", "operator": "…" }` reads one field and compares it with a value. The value goes in `values`, `value`, `business_hours` or `name`, depending on the field.
* **Group**: `{ "kind": "all", "conditions": [] }` holds when every one of its conditions holds. With `"kind": "any"`, it holds when at least one does. A group has 1 to 20 conditions, which are comparisons or other groups, three levels deep at most.

| `field`               | `operator`                                                         | Value                                                                                                                                                                           | Where it is used                                                                                           |
| --------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `channel`             | `is`, `is_not`                                                     | `values`: channel IDs. See `GET /channels`.                                                                                                                                     | Every trigger.                                                                                             |
| `time`                | `within`, `outside`                                                | `business_hours`: [hours](#business-hours). The moment Ricky evaluates the condition is compared.                                                                               | Every trigger.                                                                                             |
| `assignee`            | `is`, `is_not`                                                     | `values`: `{ "kind": "person", "user_id": "…" }` for a member, `{ "kind": "agent", "agent_id": "…" }` for an AI agent, or `{ "kind": "nobody" }` when nobody has it.            | Every trigger but `call_received`.                                                                         |
| `conversation_status` | `is`, `is_not`                                                     | `values`: `open` or `closed`.                                                                                                                                                   | Every trigger but `call_received`.                                                                         |
| `ai`                  | `is`, `is_not`                                                     | `values`: `on` while an AI agent answers the conversation, as its assignee or with the AI on in it; otherwise `off`.                                                            | Every trigger but `call_received`.                                                                         |
| `message_first`       | `is`, `is_not`                                                     | None. `is` holds when the contact wrote first in the conversation, before any message from the business.                                                                        | The `condition` of `conversation_opened`, `first_message_received` and `message_received`.                 |
| `message_type`        | `is`, `is_not`                                                     | `values`: `text`, `button`, `image`, `audio`, `video`, `document`, `location`, `sticker` or `other`. `button` is a button or list option the contact tapped.                    | The `condition` of `conversation_opened`, `first_message_received`, `message_received` and `message_sent`. |
| `message_text`        | `contains`, `not_contains`                                         | `value`: a text of 1 to 500 characters.                                                                                                                                         | The `condition` of `conversation_opened`, `first_message_received`, `message_received` and `message_sent`. |
| `message_sender`      | `is`, `is_not`                                                     | `values`: `person` (the team), `ai` (an AI agent and its tools), `automation` (a workflow), `broadcast` (a broadcast) or `external_app` (another app connected to the channel). | The `condition` of `message_sent`.                                                                         |
| `variable`            | `is`, `is_not`, `contains`, `not_contains`, `exists`, `not_exists` | `name`: the `answer_key` an earlier `ask_question` step saved. `value`: a text; left out with `exists` and `not_exists`.                                                        | The branches of a `decision` step, except in `call_received`.                                              |

This is how Ricky evaluates a comparison:

* With several `values`, `is` holds when it holds for any of them, and `is_not` when it holds for none.
* When the field is missing, such as a variable no step saved, the positive operator does not hold and its negation does.
* `message_text` is compared ignoring case, accents and repeated spaces. `variable`, ignoring case and accents.
* A range of hours includes its start time and not its end: with 09:00–18:00, at 18:00 the time is already outside.

Without a `channel` comparison, the workflow runs on every channel, including channels you connect later.

## Create a workflow

This workflow answers every new conversation that reaches the WhatsApp number while nobody has it. It asks for the reason, and then a decision picks who gets the conversation.

```bash
curl https://getricky.ai/api/v1/workflows \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: workflow-welcome-and-routing" \
  -d '{
    "name": "Welcome and routing",
    "definition": {
      "trigger": "conversation_opened",
      "condition": {
        "kind": "all",
        "conditions": [
          { "kind": "compare", "field": "channel", "operator": "is", "values": ["8f3c2a5e-6b1d-4c7a-9e2f-1a2b3c4d5e6f"] },
          { "kind": "compare", "field": "assignee", "operator": "is", "values": [{ "kind": "nobody" }] }
        ]
      },
      "flow": {
        "entry": "reason",
        "steps": [
          {
            "id": "reason",
            "kind": "ask_question",
            "text": "Hi, thanks for writing. How can we help?",
            "answer_key": "reason",
            "choices": [],
            "timeout_seconds": 3600,
            "on_timeout": "routing",
            "on_invalid": "routing",
            "next": "routing"
          },
          {
            "id": "routing",
            "kind": "decision",
            "branches": [
              {
                "id": "complaint",
                "name": "Complaint",
                "condition": { "kind": "compare", "field": "variable", "name": "reason", "operator": "contains", "value": "complaint" },
                "next": "supervisor"
              },
              {
                "id": "during_hours",
                "name": "During hours",
                "condition": {
                  "kind": "compare",
                  "field": "time",
                  "operator": "within",
                  "business_hours": {
                    "timezone": "America/Panama",
                    "days": {
                      "monday": [{ "start": "09:00", "end": "18:00" }],
                      "tuesday": [{ "start": "09:00", "end": "18:00" }],
                      "wednesday": [{ "start": "09:00", "end": "18:00" }],
                      "thursday": [{ "start": "09:00", "end": "18:00" }],
                      "friday": [{ "start": "09:00", "end": "18:00" }],
                      "saturday": [{ "start": "09:00", "end": "13:00" }]
                    },
                    "closed_dates": ["2026-12-25"]
                  }
                },
                "next": "team"
              }
            ],
            "next": "agent"
          },
          { "id": "supervisor", "kind": "assign_user", "user_id": "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d", "next": null },
          { "id": "team", "kind": "assign_user", "user_id": "2d4f6a8c-1b3d-4e5f-8a7b-9c0d1e2f3a4b", "next": null },
          { "id": "agent", "kind": "assign_agent", "agent_id": "7e8f9a0b-1c2d-4e3f-a4b5-c6d7e8f9a0b1", "next": null }
        ]
      }
    }
  }'
```

The `condition` requires both comparisons of the `all` group: the channel is that WhatsApp number and nobody has the conversation. The `routing` step checks its branches in order and goes on through the first that holds:

1. `Complaint`: if the answer saved in `reason` contains «complaint», the conversation goes to the supervisor, at any hour.
2. `During hours`: otherwise, while the business is open, it goes to a person on the team.
3. When no branch holds, it goes on to the step's `next`, which the editor calls «Otherwise»: an AI agent. This also happens when the contact does not answer within an hour, because `reason` then does not exist.

The response is `201` with the workflow in `status: "draft"`. A draft runs nothing.

Ricky checks the definition before storing it:

* Step IDs are unique and `entry` exists.
* Every `next`, the `next` of each branch and each choice, `on_timeout` and `on_invalid` point to an existing step, or are `null`.
* The flow has no loop without a question or a wait.
* Each comparison uses a field its trigger offers in that place ([Conditions](#conditions)).
* Its channels, members and agents belong to the organization.
* Questions with buttons need a `channel` `is` comparison with only WhatsApp channels.

When a check fails, the response is `400 invalid_input` with `param: "definition"` and the reason in `message`.

## Steps

| `kind`               | Does                                                                                                                                           | Fields                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `send_message`       | Sends a text.                                                                                                                                  | `text`                                                                         |
| `ask_question`       | Asks and waits for the answer. With `choices`, shows buttons or a list.                                                                        | `text`, `answer_key`, `choices`, `timeout_seconds`, `on_timeout`, `on_invalid` |
| `decision`           | Checks its branches in order and goes on through the first whose condition holds. When none holds, goes to `next`.                             | `branches`, `next` ([below](#decision))                                        |
| `wait`               | Waits before the next step, up to 7 days.                                                                                                      | `seconds`                                                                      |
| `assign_user`        | Assigns the conversation to a member and continues at `next`.                                                                                  | `user_id`                                                                      |
| `assign_agent`       | Puts an AI agent on the conversation and continues at `next`.                                                                                  | `agent_id`                                                                     |
| `close_conversation` | Closes the conversation and ends the flow.                                                                                                     |                                                                                |
| `end`                | Ends the flow.                                                                                                                                 |                                                                                |
| `turn_on_ai`         | Only in `schedule` and `conversation_assigned`: turns the AI on with that agent; the conversation stays assigned to its member. Ends the flow. | `agent_id`                                                                     |
| `turn_off_ai`        | Only in `schedule` and `conversation_assigned`: turns the AI off in the conversation. Ends the flow.                                           |                                                                                |
| `answer_call`        | Only in `call_received`: the AI agent answers the call. It does not reassign the conversation. Ends the flow.                                  | `agent_id`                                                                     |
| `decline_call`       | Only in `call_received`: Ricky rejects the call and sends the text to the caller's WhatsApp. Ends the flow.                                    | `text`                                                                         |

A `call_received` workflow needs a `channel` `is` comparison in its `condition`, with WhatsApp numbers that have AI calls turned on. Its flow takes only `answer_call`, `decline_call` and `decision`. Its `condition` and its decisions read only `channel` and `time`, because a call has no conversation to check. Ricky checks the most recently published definition first. The first active one whose `condition` holds and whose decisions reach one of those steps decides, even when a person holds the conversation; without one, the agent that holds the caller's conversation answers.

A `schedule` or `conversation_assigned` workflow takes only `turn_on_ai`, `turn_off_ai`, `decision` and `end`.

A workflow's messages are free-form text. So they only arrive inside the channel's reply window; on WhatsApp, 24 hours from the contact's last message.

### Decision

A `decision` step picks the route of the run:

* `branches`: 1 to 10 branches, in the order Ricky checks them. Each branch has `id`, `name` (up to 40 characters, different for each branch of the step), `condition` and `next`.
* `next`: the step to run when no branch holds. The editor calls it «Otherwise». `null` ends the flow.

Ricky goes on through the first branch whose condition holds and does not check the rest. A branch's condition is read when the run reaches the step, with the data of that moment: the conversation (`assignee`, `conversation_status`, `ai`, `channel`), the time (`time`) and the saved answers (`variable`). A branch does not read the message that started the workflow: `message_first`, `message_type`, `message_text` and `message_sender` only go in the trigger's `condition`.

### Business hours

`business_hours` is the value of a `time` comparison:

* `timezone`: an IANA time zone, such as `America/Panama`.
* `days`: each weekday (`monday` to `sunday`) with up to 3 ranges `{ "start": "HH:MM", "end": "HH:MM" }`, in order. A day left out or empty is closed. A range never crosses midnight: `end` is after `start`, and `24:00` is the end of the day; an overnight shift is two ranges on two days.
* `closed_dates`: dates closed whatever the weekday says, such as holidays, `YYYY-MM-DD`.

Before hours per day, `business_hours` was one range for several days: `start`, `end` and `weekdays` (0 for Sunday to 6 for Saturday). Requests still accept it; when `days` comes, those fields are ignored. Responses carry `days` and `closed_dates`, and also `start`, `end` and `weekdays`, which are exact when every open day has the same hours and are deprecated.

### Scheduled

A workflow with `trigger: "schedule"` runs at set times on the conversations of some members. It serves, for example, to turn the AI on when a team closes and off when it opens.

* `schedule.timezone`: the IANA time zone of every time.
* `schedule.times`: 1 to 20 times. Each has `time`, a quarter hour `HH:MM`, and `weekdays`, the days it runs at that time, from 0 (Sunday) to 6 (Saturday). Each time of each day appears once.
* `schedule` is required with `trigger: "schedule"`, and no other trigger takes it.
* The `condition` needs an `assignee` `is` comparison with at least one member that must always hold: not inside an `any` group.

At each time, the workflow runs once on each conversation assigned then to those members on which the whole `condition` holds. This definition turns the AI on at 18:00 and off at 09:00, Monday to Friday:

```json
{
  "trigger": "schedule",
  "schedule": {
    "timezone": "America/Panama",
    "times": [
      { "time": "09:00", "weekdays": [1, 2, 3, 4, 5] },
      { "time": "18:00", "weekdays": [1, 2, 3, 4, 5] }
    ]
  },
  "condition": {
    "kind": "all",
    "conditions": [
      { "kind": "compare", "field": "assignee", "operator": "is", "values": [{ "kind": "person", "user_id": "2d4f6a8c-1b3d-4e5f-8a7b-9c0d1e2f3a4b" }] },
      { "kind": "compare", "field": "conversation_status", "operator": "is", "values": ["open"] }
    ]
  },
  "flow": {
    "entry": "hours",
    "steps": [
      {
        "id": "hours",
        "kind": "decision",
        "branches": [
          {
            "id": "closed",
            "name": "Closed",
            "condition": {
              "kind": "compare",
              "field": "time",
              "operator": "outside",
              "business_hours": {
                "timezone": "America/Panama",
                "days": {
                  "monday": [{ "start": "09:00", "end": "18:00" }],
                  "tuesday": [{ "start": "09:00", "end": "18:00" }],
                  "wednesday": [{ "start": "09:00", "end": "18:00" }],
                  "thursday": [{ "start": "09:00", "end": "18:00" }],
                  "friday": [{ "start": "09:00", "end": "18:00" }]
                }
              }
            },
            "next": "turn_on"
          }
        ],
        "next": "turn_off"
      },
      { "id": "turn_on", "kind": "turn_on_ai", "agent_id": "7e8f9a0b-1c2d-4e3f-a4b5-c6d7e8f9a0b1", "next": null },
      { "id": "turn_off", "kind": "turn_off_ai", "next": null }
    ]
  }
}
```

At 18:00 the time is already outside the hours, because a range does not include its end time: the `Closed` branch holds and turns the AI on. At 09:00 the time is within: no branch holds, and the step's `next` turns the AI off.

## Deprecated fields

Requests still accept the shape from before November 24, 2026. Ricky stores it in the new shape, and responses carry only the new shape. This is how Ricky reads each deprecated field:

| In the request                                                              | Ricky stores it as                                                                                                                                            |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `channel_ids`                                                               | A `channel` `is` comparison with those channels.                                                                                                              |
| `condition` with `kind` `inside_business_hours` or `outside_business_hours` | A `time` comparison, `within` or `outside`, with the same `business_hours`.                                                                                   |
| `message_filters.first_message: true`                                       | `message_first` `is`.                                                                                                                                         |
| `message_filters.only_unassigned: true`                                     | `assignee` `is` `{ "kind": "nobody" }`.                                                                                                                       |
| `first_message` and `only_unassigned`, both `true`                          | An `any` group with those two comparisons.                                                                                                                    |
| `message_filters.skip_buttons: true`                                        | `message_type` `is_not` `button`.                                                                                                                             |
| `sent_message_filters.senders`                                              | `message_sender` `is` those senders.                                                                                                                          |
| `sent_message_filters.text_contains`                                        | `message_text` `contains` that text.                                                                                                                          |
| `conversation_filters.assigned_user_ids`                                    | `assignee` `is` those members.                                                                                                                                |
| `conversation_filters.only_open: true`                                      | `conversation_status` `is` `open`.                                                                                                                            |
| `trigger: "at_time"` with `at_time`                                         | `trigger: "schedule"` with a `schedule` of that one time, its days and its time zone.                                                                         |
| A `branch` step                                                             | A `decision` step with one branch of `id` `met` and `name` «Se cumple», which goes to the `branch`'s `next`. Its `otherwise` becomes the `decision`'s `next`. |
| A `branch` with `answer_key`, `operator` and `value`                        | A branch with a `variable` comparison: `equals` becomes `is`, and `contains` and `exists` stay the same.                                                      |
| A `branch` with `business_hours`                                            | A branch with a `time` `within` comparison.                                                                                                                   |

When a request carries several deprecated fields, Ricky joins them in an `all` group. When it also carries a new `condition`, both must hold.

An integration that reads `channel_ids`, `message_filters`, `sent_message_filters`, `at_time`, `conversation_filters`, the hours `condition` or `branch` steps from responses must now read `condition`, `schedule` and `decision` steps.

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

A scheduled workflow (`type: "scheduled"`) sends a WhatsApp template every day from Odoo: appointment reminders or birthday greetings. It is not the `schedule` trigger («Scheduled»), which runs on conversations. It is set up in Ricky; with the API you can also set its header file and, for appointment reminders, see what it will send and what it sent.

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

This example needs an order-ready event from your system and a later check of the pickup tag. The workflow editor supports neither operation. Use the API from your system for those steps.

1. **Send the template.** Call `POST /conversations` with the phone and the `pedido_listo` template. Use `Idempotency-Key: order-10482-ready`. Keep the `conversation_id` of the response. See [Sending messages](./sending-messages.md).
2. **Schedule the check.** In your system, schedule a job 3 days later with the order number and the `conversation_id`.
3. **Check the tag.** When the job runs, read the conversation with `GET /conversations/{conversation_id}` to get `contact.id`. Then read the contact with `GET /contacts/{contact_id}` and look for the `retirado` tag in `tags`. Your team applies it in Ricky when the customer picks up; your system can also apply it with `PATCH /contacts/{contact_id}` and `tag_ids`.
4. **Send the reminder.** If the tag is missing, call `POST /conversations/{conversation_id}/messages` with `type: "template"` and the `pedido_recordatorio` template. Use `Idempotency-Key: order-10482-reminder`, so a retry does not send it twice.

A template can be sent at any time, even when the reply window is closed.

## Shared canvas drafts

Use `POST /workflow-drafts` to create an incomplete conversation, chat-state or call workflow. Use `GET /workflow-drafts` to list editable identities. A new identity appears in the complete-workflow list once it has a complete legacy row. Daily reminders use their existing editor.

`GET /workflows/{workflow_id}/draft` identifies the source of the working copy and returns its revision, published head and candidate token. Pass these values in `expected` with `PUT` to save the partial `document`. The document holds the fields actually entered into the definition, up to 256 KiB and 32 levels. Keep an attachment's public `attachment_id` when editing its step. A save or restore leaves the live graph alone.

After a 409, read the working copy again. To replace the reviewed shared draft, send its fresh tokens and `overwrite: true`. An intervening edit produces another 409. If a complete legacy candidate changed before first publication, review that candidate and supply its current token and `confirm_candidate: true` when publishing.

Use `PATCH /workflow-drafts/{workflow_id}` to change the name immediately. Use `POST /workflows/{workflow_id}/publish` with the observed tokens to publish. First publication stays paused unless `activate` is true. Later publication keeps the workflow's status unless activation is requested. Reuse the same Idempotency-Key when retrying a write.

`GET /workflows/{workflow_id}/versions` pages through publications. Append `/{version_id}` for the definition. POST to `/{version_id}/restore` with `expected` to copy it into the canvas draft. For a never-materialized draft, use `DELETE /workflow-drafts/{workflow_id}`. For a complete workflow, use the existing workflow delete operation.
