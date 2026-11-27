# Workflows

URL: https://getricky.ai/docs/api/workflows

> Crea, edita, activa y pausa los workflows de la organización, y revisa sus ejecuciones.

Un workflow es una automatización que Ricky ejecuta por su cuenta. La API te deja gestionar los mismos workflows que ves en Ricky, con las mismas reglas del editor.

La clave necesita el permiso `workflows:read` para leer y `workflows:write` para cambiar algo.

## Cuándo se ejecuta un workflow

Ricky inicia cada ejecución por un evento. No hay una operación para iniciar un workflow desde tu sistema.

Un workflow de conversación tiene tres partes:

* `trigger`: el evento que lo arranca.
* `condition`: la pregunta de sí o no que decide si esa ocurrencia del evento lo ejecuta ([Condiciones](#condiciones)). Con `null`, se ejecuta en cada ocurrencia y en todos los canales, también en los que conectes después.
* `flow`: los pasos que sigue ([Los pasos](#los-pasos)).

| Tipo           | `trigger`                 | Se ejecuta cuando                                                                                                                                              |
| -------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `conversation` | `conversation_opened`     | Una conversación empieza, o se reabre con un mensaje del contacto.                                                                                             |
| `conversation` | `first_message_received`  | El contacto escribe primero en una conversación, antes de cualquier mensaje de la empresa.                                                                     |
| `conversation` | `message_received`        | Llega cualquier mensaje del contacto.                                                                                                                          |
| `conversation` | `message_sent`            | Sale un mensaje de la empresa. Corre en los 15 minutos siguientes, si el contacto no respondió antes.                                                          |
| `conversation` | `call_received`           | Llega una llamada de WhatsApp. El workflow decide quién contesta.                                                                                              |
| `conversation` | `team_message_unanswered` | Pasa `inactivity_seconds` sin respuesta del contacto al último mensaje del equipo.                                                                             |
| `conversation` | `conversation_inactive`   | Pasa `inactivity_seconds` sin mensajes ni reacciones de ninguna de las partes.                                                                                 |
| `conversation` | `conversation_assigned`   | Una conversación se asigna a un miembro. La asignación que hace el handoff de un agente IA no lo ejecuta.                                                      |
| `conversation` | `schedule`                | Llega una de las horas de `schedule`. Corre en cada conversación asignada en ese momento a los miembros que nombra su `condition` ([Programado](#programado)). |
| `scheduled`    | `{ "kind": "daily" }`     | Cada día a una hora, con las citas o cumpleaños de Odoo.                                                                                                       |

`inactivity_seconds` va de 60 a 31536000 segundos. Es obligatorio en `team_message_unanswered` y `conversation_inactive`, y solo ellos lo admiten.

La API crea y edita workflows de conversación. Los workflows programados se crean en Ricky; la API los lee, les cambia el nombre, los activa, los pausa y los elimina, define su archivo de encabezado, y previsualiza y revisa los recordatorios de citas y sus estados de Odoo ([más abajo](#workflows-programados)).

Un workflow de conversación puede contener un paso de plantilla de WhatsApp (`send_whatsapp_template`). Las rutas de lectura devuelven la plantilla e indican si tiene imagen de encabezado. Las rutas POST y PATCH de definición completa rechazan ese paso. Las herramientas MCP existentes aceptan la referencia opaca que devuelven en `headerMedia.storagePath`. Conserva ese valor al editar el workflow de lienzo.

## Condiciones

`condition` es una pregunta de sí o no. Tiene una de dos formas:

* **Comparación**: `{ "kind": "compare", "field": "…", "operator": "…" }` lee un dato (`field`) y lo compara con un valor. El valor va en `values`, `value`, `business_hours` o `name`, según el dato.
* **Grupo**: `{ "kind": "all", "conditions": [] }` se cumple si se cumplen todas sus condiciones. Con `"kind": "any"`, se cumple si se cumple al menos una. Un grupo tiene de 1 a 20 condiciones, que son comparaciones u otros grupos, hasta tres niveles.

| `field`               | `operator`                                                         | Valor                                                                                                                                                                          | Dónde se usa                                                                                            |
| --------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `channel`             | `is`, `is_not`                                                     | `values`: IDs de canales. Consulta `GET /channels`.                                                                                                                            | Todos los disparadores.                                                                                 |
| `time`                | `within`, `outside`                                                | `business_hours`: un [horario](#horario-de-atención). Se compara el momento en que Ricky evalúa la condición.                                                                  | Todos los disparadores.                                                                                 |
| `assignee`            | `is`, `is_not`                                                     | `values`: `{ "kind": "person", "user_id": "…" }` para un miembro, `{ "kind": "agent", "agent_id": "…" }` para un agente IA, o `{ "kind": "nobody" }` si nadie la tiene.        | Todos menos `call_received`.                                                                            |
| `conversation_status` | `is`, `is_not`                                                     | `values`: `open` o `closed`.                                                                                                                                                   | Todos menos `call_received`.                                                                            |
| `ai`                  | `is`, `is_not`                                                     | `values`: `on` mientras un agente IA contesta la conversación, como asignado o con la IA prendida; si no, `off`.                                                               | Todos menos `call_received`.                                                                            |
| `message_first`       | `is`, `is_not`                                                     | Ninguno. `is` se cumple cuando el contacto escribió primero en la conversación, antes de cualquier mensaje de la empresa.                                                      | La `condition` de `conversation_opened`, `first_message_received` y `message_received`.                 |
| `message_type`        | `is`, `is_not`                                                     | `values`: `text`, `button`, `image`, `audio`, `video`, `document`, `location`, `sticker` u `other`. `button` es un botón u opción de lista que tocó el contacto.               | La `condition` de `conversation_opened`, `first_message_received`, `message_received` y `message_sent`. |
| `message_text`        | `contains`, `not_contains`                                         | `value`: un texto de 1 a 500 caracteres.                                                                                                                                       | La `condition` de `conversation_opened`, `first_message_received`, `message_received` y `message_sent`. |
| `message_sender`      | `is`, `is_not`                                                     | `values`: `person` (el equipo), `ai` (un agente IA y sus herramientas), `automation` (un workflow), `broadcast` (una difusión) o `external_app` (otra app conectada al canal). | La `condition` de `message_sent`.                                                                       |
| `variable`            | `is`, `is_not`, `contains`, `not_contains`, `exists`, `not_exists` | `name`: el `answer_key` que guardó un paso `ask_question` anterior. `value`: un texto; no va con `exists` ni `not_exists`.                                                     | Las ramas de un paso `decision`, menos en `call_received`.                                              |

Así evalúa Ricky una comparación:

* Con varios `values`, `is` se cumple si se cumple con cualquiera de ellos, e `is_not` si no se cumple con ninguno.
* Si el dato no existe, como una variable que ningún paso guardó, el operador positivo no se cumple y su negación sí.
* `message_text` se compara sin distinguir mayúsculas, tildes ni espacios repetidos. `variable`, sin distinguir mayúsculas ni tildes.
* Un rango de horario incluye su hora de inicio y no la de fin: con 09:00–18:00, a las 18:00 la hora ya está fuera.

Sin una comparación `channel`, el workflow corre en todos los canales, también en los que conectes después.

## Crea un workflow

Este workflow responde cada conversación nueva que llega al WhatsApp sin que nadie la tenga. Pregunta el motivo y luego una decisión elige a quién asignarla.

```bash
curl https://getricky.ai/api/v1/workflows \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: workflow-bienvenida-y-reparto" \
  -d '{
    "name": "Bienvenida y reparto",
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
        "entry": "motivo",
        "steps": [
          {
            "id": "motivo",
            "kind": "ask_question",
            "text": "Hola, gracias por escribir. ¿En qué te ayudamos?",
            "answer_key": "motivo",
            "choices": [],
            "timeout_seconds": 3600,
            "on_timeout": "reparto",
            "on_invalid": "reparto",
            "next": "reparto"
          },
          {
            "id": "reparto",
            "kind": "decision",
            "branches": [
              {
                "id": "reclamo",
                "name": "Reclamo",
                "condition": { "kind": "compare", "field": "variable", "name": "motivo", "operator": "contains", "value": "reclamo" },
                "next": "supervisora"
              },
              {
                "id": "en_horario",
                "name": "En horario",
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
                "next": "equipo"
              }
            ],
            "next": "agente"
          },
          { "id": "supervisora", "kind": "assign_user", "user_id": "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d", "next": null },
          { "id": "equipo", "kind": "assign_user", "user_id": "2d4f6a8c-1b3d-4e5f-8a7b-9c0d1e2f3a4b", "next": null },
          { "id": "agente", "kind": "assign_agent", "agent_id": "7e8f9a0b-1c2d-4e3f-a4b5-c6d7e8f9a0b1", "next": null }
        ]
      }
    }
  }'
```

La `condition` exige las dos comparaciones del grupo `all`: el canal es ese WhatsApp y nadie tiene la conversación. El paso `reparto` revisa sus ramas en orden y sigue por la primera que se cumple:

1. `Reclamo`: si la respuesta guardada en `motivo` contiene «reclamo», la conversación va a la supervisora, a cualquier hora.
2. `En horario`: si no, y el negocio está abierto, va a una persona del equipo.
3. Si ninguna rama se cumple, sigue al `next` del paso, que en el editor se llama «Si no»: un agente IA. Pasa también si el contacto no responde en una hora, porque entonces `motivo` no existe.

La respuesta es `201` con el workflow en `status: "draft"`. Un borrador no ejecuta nada.

Ricky revisa la definición antes de guardarla:

* Los IDs de los pasos son únicos y `entry` existe.
* Cada `next`, el `next` de cada rama y de cada opción, `on_timeout` y `on_invalid` apuntan a un paso que existe, o son `null`.
* El flujo no tiene un ciclo sin pregunta ni espera.
* Cada comparación usa un dato que su disparador ofrece en ese lugar ([Condiciones](#condiciones)).
* Los canales, miembros y agentes pertenecen a la organización.
* Las preguntas con botones necesitan una comparación `channel` `is` con solo canales de WhatsApp.

Si algo falla, la respuesta es `400 invalid_input` con `param: "definition"` y el motivo en `message`.

## Los pasos

| `kind`               | Hace                                                                                                                                      | Campos                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `send_message`       | Envía un texto.                                                                                                                           | `text`                                                                         |
| `ask_question`       | Pregunta y espera la respuesta. Con `choices`, muestra botones u opciones.                                                                | `text`, `answer_key`, `choices`, `timeout_seconds`, `on_timeout`, `on_invalid` |
| `decision`           | Revisa sus ramas en orden y sigue por la primera cuya condición se cumple. Si ninguna se cumple, sigue a `next`.                          | `branches`, `next` ([abajo](#decisión))                                        |
| `wait`               | Espera antes del paso siguiente, hasta 7 días.                                                                                            | `seconds`                                                                      |
| `assign_user`        | Asigna la conversación a un miembro y sigue en `next`.                                                                                    | `user_id`                                                                      |
| `assign_agent`       | Pone un agente IA en la conversación y sigue en `next`.                                                                                   | `agent_id`                                                                     |
| `close_conversation` | Cierra la conversación y termina el flujo.                                                                                                |                                                                                |
| `end`                | Termina el flujo.                                                                                                                         |                                                                                |
| `turn_on_ai`         | Solo en `schedule` y `conversation_assigned`: prende la IA con ese agente; la conversación sigue asignada a su miembro. Termina el flujo. | `agent_id`                                                                     |
| `turn_off_ai`        | Solo en `schedule` y `conversation_assigned`: apaga la IA en la conversación. Termina el flujo.                                           |                                                                                |
| `answer_call`        | Solo en `call_received`: el agente IA contesta la llamada. No reasigna la conversación. Termina el flujo.                                 | `agent_id`                                                                     |
| `decline_call`       | Solo en `call_received`: Ricky rechaza la llamada y envía el texto al WhatsApp de quien llamó. Termina el flujo.                          | `text`                                                                         |

Un workflow `call_received` necesita en su `condition` una comparación `channel` `is` con números de WhatsApp que tengan llamadas con IA activadas. Su flujo admite solo `answer_call`, `decline_call` y `decision`. Su `condition` y sus decisiones leen solo `channel` y `time`, porque una llamada no tiene conversación que revisar. Se revisan en orden de publicación, del más reciente al más antiguo. El primero activo cuya `condition` se cumple y cuyas decisiones llegan a uno de esos pasos decide, aunque una persona tenga la conversación; sin él, contesta el agente que tiene la conversación de quien llama.

Un workflow `schedule` o `conversation_assigned` admite solo `turn_on_ai`, `turn_off_ai`, `decision` y `end`.

Los mensajes de un workflow son texto libre. Por eso solo llegan dentro de la ventana de respuesta del canal; en WhatsApp, 24 horas desde el último mensaje del contacto.

### Decisión

Un paso `decision` elige el camino de la ejecución:

* `branches`: de 1 a 10 ramas, en el orden en que Ricky las revisa. Cada rama tiene `id`, `condition` y `next`. El campo opcional `name` admite hasta 40 caracteres y debe ser único dentro de la decisión. El editor numera las ramas sin nombre. Al publicar se reservan los nombres de la salida de respaldo «Si no», «Otherwise», «If none match» y «Si ninguna coincide». Se ignoran las mayúsculas y los espacios al principio y al final.
* `next`: el paso que sigue cuando ninguna rama se cumple. En el editor se llama «Si no». `null` termina el flujo.

Ricky sigue por la primera rama cuya condición se cumple y no revisa las demás. La condición de una rama se lee cuando la ejecución llega al paso, con los datos de ese momento: la conversación (`assignee`, `conversation_status`, `ai`, `channel`), la hora (`time`) y las respuestas guardadas (`variable`). Una rama no lee el mensaje que arrancó el workflow: `message_first`, `message_type`, `message_text` y `message_sender` solo van en la `condition` del disparador.

### Horario de atención

`business_hours` es el valor de una comparación `time`:

* `timezone`: una zona horaria IANA, como `America/Panama`.
* `days`: cada día de la semana (`monday` a `sunday`) con hasta 3 franjas `{ "start": "HH:MM", "end": "HH:MM" }`, en orden. Un día que falta o vacío está cerrado. Una franja nunca cruza la medianoche: `end` va después de `start`, y `24:00` es el final del día; un turno de noche son dos franjas en dos días.
* `closed_dates`: fechas cerradas aunque su día de la semana abra, como los feriados, `YYYY-MM-DD`.

Antes del horario por día, `business_hours` era una sola franja para varios días: `start`, `end` y `weekdays` (0 para domingo a 6 para sábado). Las solicitudes la siguen aceptando; si llega `days`, esos campos se ignoran. Las respuestas traen `days` y `closed_dates`, y también `start`, `end` y `weekdays`, exactos cuando todos los días abiertos tienen el mismo horario y obsoletos.

### Programado

Un workflow con `trigger: "schedule"` corre a horas fijas sobre las conversaciones de unos miembros. Sirve, por ejemplo, para prender la IA cuando cierra un equipo y apagarla cuando abre.

* `schedule.timezone`: la zona horaria IANA de todas las horas.
* `schedule.times`: de 1 a 20 horas. Cada una tiene `time`, un cuarto de hora `HH:MM`, y `weekdays`, los días en que corre a esa hora, de 0 (domingo) a 6 (sábado). Cada hora de cada día va una sola vez.
* `schedule` es obligatorio con `trigger: "schedule"`, y ningún otro disparador lo admite.
* La `condition` necesita una comparación `assignee` `is` con al menos un miembro, que deba cumplirse siempre: no dentro de un grupo `any`.

A cada hora, el workflow corre una vez en cada conversación asignada en ese momento a esos miembros en la que se cumple toda la `condition`. Esta definición prende la IA a las 18:00 y la apaga a las 09:00, de lunes a viernes:

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
    "entry": "horario",
    "steps": [
      {
        "id": "horario",
        "kind": "decision",
        "branches": [
          {
            "id": "cerrado",
            "name": "Cerrado",
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
            "next": "prender"
          }
        ],
        "next": "apagar"
      },
      { "id": "prender", "kind": "turn_on_ai", "agent_id": "7e8f9a0b-1c2d-4e3f-a4b5-c6d7e8f9a0b1", "next": null },
      { "id": "apagar", "kind": "turn_off_ai", "next": null }
    ]
  }
}
```

A las 18:00 la hora ya está fuera del horario, porque una franja no incluye su hora de fin: la rama `Cerrado` se cumple y prende la IA. A las 09:00 la hora está dentro: ninguna rama se cumple y el `next` del paso apaga la IA.

## Campos obsoletos

Las solicitudes todavía aceptan la forma anterior al 24 de noviembre de 2026. Ricky la guarda en la forma nueva, y las respuestas traen solo la forma nueva. Así lee cada campo obsoleto:

| En la solicitud                                                           | Ricky lo guarda como                                                                                                                                      |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `channel_ids`                                                             | Una comparación `channel` `is` con esos canales.                                                                                                          |
| `condition` con `kind` `inside_business_hours` u `outside_business_hours` | Una comparación `time` `within` u `outside` con el mismo `business_hours`.                                                                                |
| `message_filters.first_message: true`                                     | `message_first` `is`.                                                                                                                                     |
| `message_filters.only_unassigned: true`                                   | `assignee` `is` `{ "kind": "nobody" }`.                                                                                                                   |
| `first_message` y `only_unassigned`, los dos `true`                       | Un grupo `any` con esas dos comparaciones.                                                                                                                |
| `message_filters.skip_buttons: true`                                      | `message_type` `is_not` `button`.                                                                                                                         |
| `sent_message_filters.senders`                                            | `message_sender` `is` esos remitentes.                                                                                                                    |
| `sent_message_filters.text_contains`                                      | `message_text` `contains` ese texto.                                                                                                                      |
| `conversation_filters.assigned_user_ids`                                  | `assignee` `is` esos miembros.                                                                                                                            |
| `conversation_filters.only_open: true`                                    | `conversation_status` `is` `open`.                                                                                                                        |
| `trigger: "at_time"` con `at_time`                                        | `trigger: "schedule"` con un `schedule` de esa sola hora, sus días y su zona horaria.                                                                     |
| Un paso `branch`                                                          | Un paso `decision` con una rama de `id` `met` y `name` «Se cumple», que sigue al `next` del `branch`. Su `otherwise` pasa a ser el `next` del `decision`. |
| `branch` con `answer_key`, `operator` y `value`                           | Una rama con una comparación `variable`: `equals` pasa a `is`, y `contains` y `exists` quedan igual.                                                      |
| `branch` con `business_hours`                                             | Una rama con una comparación `time` `within`.                                                                                                             |

Si una solicitud trae varios campos obsoletos, Ricky los une en un grupo `all`. Si además trae una `condition` nueva, deben cumplirse las dos.

Una integración que lee de las respuestas `channel_ids`, `message_filters`, `sent_message_filters`, `at_time`, `conversation_filters`, la `condition` de horario o los pasos `branch` debe leer ahora `condition`, `schedule` y los pasos `decision`.

## Activa y pausa

```bash
curl -X POST https://getricky.ai/api/v1/workflows/$WORKFLOW_ID/activate \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

Al activar, Ricky revisa otra vez lo que el workflow referencia. Un workflow que asigna un agente IA necesita una suscripción activa; sin ella, la respuesta es `422 rule_violation`.

`POST /workflows/{workflow_id}/pause` detiene las ejecuciones nuevas. Los envíos que ya están en cola igual salen.

## Edita y elimina

`PATCH /workflows/{workflow_id}` cambia `name`, reemplaza toda la `definition`, o ambos. El estado se conserva: un workflow activo ejecuta la definición nueva desde su próxima ejecución.

`DELETE /workflows/{workflow_id}` elimina el workflow y responde con él tal como estaba.

## Revisa las ejecuciones

```bash
curl "https://getricky.ai/api/v1/workflows/$WORKFLOW_ID/executions?page_size=20" \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

Cada ejecución trae su `status`, sus `attempts` y `last_error`. El estado dice si Ricky ejecutó el workflow, no si cada mensaje llegó. Para eso, lee los mensajes de la conversación o suscríbete a `message.failed`. La lista se pagina con `next_cursor`, como en [Paginación](./pagination.md).

## Workflows programados

Un workflow programado (`type: "scheduled"`) envía una plantilla de WhatsApp cada día desde Odoo: recordatorios de citas o saludos de cumpleaños. No es el disparador `schedule` («Programado»), que corre sobre conversaciones. Se configura en Ricky; con la API también puedes definir su archivo de encabezado y, en los recordatorios de citas, ver qué enviará y qué envió.

### Archivo de encabezado

Si la plantilla tiene un encabezado de imagen, video o documento, cada envío lleva el archivo que guardes:

```bash
curl -X POST https://getricky.ai/api/v1/workflows/$WORKFLOW_ID/header-media \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: encabezado-octubre" \
  -d '{ "url": "https://example.com/recordatorio.jpg" }'
```

Ricky descarga `url` como con los [archivos que envías](./sending-messages.md): HTTPS público, sin redirecciones y con un `Content-Type` del tipo que admite el encabezado, dentro del límite de WhatsApp para ese tipo. El archivo nuevo reemplaza al anterior. La respuesta es el workflow, con `has_header_image: true`. Una plantilla sin encabezado de archivo recibe `422 rule_violation`; un archivo de otro tipo recibe `400 invalid_input` con `param: "url"`. Exige `workflows:write`.

### Vista previa de recordatorios

```bash
curl "https://getricky.ai/api/v1/workflows/$WORKFLOW_ID/reminders/preview?date=2026-10-20" \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

Ricky lee Odoo en ese momento y responde cada cita que el workflow recordaría ese día: `excluded_because` dice por qué una no se envía (`state`, `name`, `branch`, `phone`), `message` es el texto que enviaría y `delivery` el envío ya registrado, si lo hay. `date` es el día en que corre el workflow, su próxima ejecución o después. `appointment_states=confirmed,pending` previsualiza otros estados de Odoo sin guardarlos. No envía nada. Necesita Odoo conectado; si no, `422 rule_violation`.

### Historial de recordatorios

`GET /workflows/{workflow_id}/reminders/history?date=2026-10-14` responde lo que el workflow revisó y envió un día pasado, según lo que Ricky registró: cada cita con su exclusión, el mensaje, cuándo se puso en cola y el `status` de su entrega. No lee Odoo.

### Estados de cita

`GET /workflows/{workflow_id}/reminders/state-options` lee de Odoo, en ese momento, todos los estados de cita que tiene su instalación, cada uno con su `value` y su `label`: los valores que toman `source.appointment_states` y el `appointment_states` de la vista previa. Necesita Odoo conectado; si no, `422 rule_violation`.

La vista previa, el historial y los estados son solo para workflows de recordatorios de citas; un workflow de cumpleaños recibe `422 rule_violation`. Los tres exigen `workflows:read`.

## Ejemplo: pedido listo con recordatorio

Quieres esto: cuando un pedido está listo, el cliente recibe una plantilla. Si en 3 días no lo retiró, recibe un recordatorio.

Este ejemplo necesita recibir el aviso de pedido listo de tu sistema y consultar después la etiqueta de retiro. El editor de workflows no admite esas dos operaciones. Usa la API desde tu sistema para estos pasos.

1. **Envía la plantilla.** Llama a `POST /conversations` con el teléfono y la plantilla `pedido_listo`. Usa `Idempotency-Key: pedido-10482-listo`. Guarda `conversation_id` de la respuesta. Consulta [Enviar mensajes](./sending-messages.md).
2. **Programa la revisión.** En tu sistema, agenda una tarea para dentro de 3 días con el número de pedido y `conversation_id`.
3. **Revisa la etiqueta.** Cuando corre la tarea, lee la conversación con `GET /conversations/{conversation_id}` para obtener `contact.id`. Luego lee el contacto con `GET /contacts/{contact_id}` y busca la etiqueta `retirado` en `tags`. Tu equipo la aplica en Ricky cuando el cliente retira; tu sistema también puede aplicarla con `PATCH /contacts/{contact_id}` y `tag_ids`.
4. **Envía el recordatorio.** Si no tiene la etiqueta, llama a `POST /conversations/{conversation_id}/messages` con `type: "template"` y la plantilla `pedido_recordatorio`. Usa `Idempotency-Key: pedido-10482-recordatorio`, para que un reintento no lo envíe dos veces.

Una plantilla se puede enviar en cualquier momento, aunque la ventana de respuesta esté cerrada.

## Borradores compartidos del lienzo

Usa `POST /workflow-drafts` para crear un workflow incompleto de conversación, estado del chat o llamada. `GET /workflow-drafts` lista los workflows editables. Una identidad nueva aparece en la lista clásica cuando ya tiene una fila completa. Los recordatorios diarios conservan su editor.

`GET /workflows/{workflow_id}/draft` indica el origen de la copia y devuelve su revisión, la versión publicada y el token del candidato. Envía esos valores en `expected` con `PUT` para guardar el `document` parcial. El documento conserva los campos ingresados en la definición, hasta 256 KiB y 32 niveles. Conserva el `attachment_id` público de un archivo si editas su paso. Guardar y restaurar mantienen la definición publicada.

Ante un 409, vuelve a leer la copia. Para reemplazar el borrador compartido que acabas de revisar, envía sus valores nuevos y `overwrite: true`. Si alguien lo cambia otra vez, recibes otro 409. Si el candidato completo cambió antes de la primera publicación, revísalo y envía su token actual y `confirm_candidate: true` al publicar.

`PATCH /workflow-drafts/{workflow_id}` cambia el nombre de inmediato. `POST /workflows/{workflow_id}/publish` publica con los valores observados. La primera publicación queda pausada salvo que `activate` sea verdadero. Las siguientes conservan el estado salvo que pidas activar el workflow. Reutiliza la misma Idempotency-Key al reintentar una escritura.

`GET /workflows/{workflow_id}/versions` pagina las publicaciones. Añade `/{version_id}` para leer la definición. Envía un POST a `/{version_id}/restore` con `expected` para copiarla al borrador del lienzo. `DELETE /workflow-drafts/{workflow_id}` elimina una identidad que nunca tuvo fila completa. Para un workflow completo, usa la operación clásica de eliminar.
