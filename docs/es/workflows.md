# Workflows

URL: https://getricky.ai/docs/api/workflows

> Crea, edita, activa y pausa los workflows de la organización, y revisa sus ejecuciones.

Un workflow es una automatización que Ricky ejecuta por su cuenta. La API te deja gestionar los mismos workflows que ves en Ricky, con las mismas reglas del editor.

La clave necesita el permiso `workflows:read` para leer y `workflows:write` para cambiar algo.

## Cuándo se ejecuta un workflow

Ricky inicia cada ejecución por un evento. No hay una operación para iniciar un workflow desde tu sistema.

| Tipo           | `trigger`                | Se ejecuta cuando                                                          |
| -------------- | ------------------------ | -------------------------------------------------------------------------- |
| `conversation` | `conversation_opened`    | Se abre una conversación en uno de sus canales.                            |
| `conversation` | `first_message_received` | Llega el primer mensaje del contacto en una conversación.                  |
| `conversation` | `message_received`       | Llega cualquier mensaje del contacto; `message_filters` lo limita.         |
| `conversation` | `call_received`          | Llega una llamada de WhatsApp a uno de sus canales; decide quién contesta. |
| `scheduled`    | `{ "kind": "daily" }`    | Cada día a una hora, con las citas o cumpleaños de Odoo.                   |

La API crea y edita workflows de conversación. Los workflows programados se crean en Ricky; la API los lee, les cambia el nombre, los activa, los pausa y los elimina, define su archivo de encabezado, y previsualiza y revisa los recordatorios de citas y sus estados de Odoo ([más abajo](#workflows-programados)).

Un workflow de conversación puede tener `condition` para ejecutarse solo dentro o fuera del horario de atención, y un paso `branch` puede seguir un camino u otro según el horario ([abajo](#horario-de-atención)).

## Crea un workflow

Este workflow responde fuera de horario, pregunta el motivo y asigna la conversación a una persona o a un agente IA.

```bash
curl https://getricky.ai/api/v1/workflows \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: workflow-fuera-de-horario" \
  -d '{
    "name": "Fuera de horario",
    "definition": {
      "trigger": "conversation_opened",
      "channel_ids": ["8f3c2a5e-6b1d-4c7a-9e2f-1a2b3c4d5e6f"],
      "condition": {
        "kind": "outside_business_hours",
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
      "flow": {
        "entry": "bienvenida",
        "steps": [
          { "id": "bienvenida", "kind": "send_message", "text": "Hola, abrimos de lunes a viernes de 9:00 a 18:00.", "next": "motivo" },
          {
            "id": "motivo",
            "kind": "ask_question",
            "text": "¿En qué te ayudamos?",
            "answer_key": "motivo",
            "choices": [
              { "id": "pedido", "label": "Mi pedido", "next": "asesor" },
              { "id": "otro", "label": "Otra consulta", "next": "agente" }
            ],
            "timeout_seconds": 3600,
            "on_timeout": "agente",
            "on_invalid": "agente",
            "next": "agente"
          },
          { "id": "asesor", "kind": "assign_user", "user_id": "2d4f6a8c-1b3d-4e5f-8a7b-9c0d1e2f3a4b", "next": null },
          { "id": "agente", "kind": "assign_agent", "agent_id": "7e8f9a0b-1c2d-4e3f-a4b5-c6d7e8f9a0b1", "next": null }
        ]
      }
    }
  }'
```

La respuesta es `201` con el workflow en `status: "draft"`. Un borrador no ejecuta nada.

Ricky revisa la definición antes de guardarla:

* Los IDs de los pasos son únicos y `entry` existe.
* Cada `next`, `otherwise`, `on_timeout` y `on_invalid` apunta a un paso que existe, o es `null`.
* El flujo no tiene un ciclo sin pregunta ni espera.
* Los canales, miembros y agentes pertenecen a la organización.
* Las preguntas con botones solo van en canales de WhatsApp.

Si algo falla, la respuesta es `400 invalid_input` con `param: "definition"` y el motivo en `message`.

## Los pasos

| `kind`               | Hace                                                                                                             | Campos                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `send_message`       | Envía un texto.                                                                                                  | `text`                                                                                                |
| `ask_question`       | Pregunta y espera la respuesta. Con `choices`, muestra botones u opciones.                                       | `text`, `answer_key`, `choices`, `timeout_seconds`, `on_timeout`, `on_invalid`                        |
| `branch`             | Evalúa una respuesta guardada, o el horario de atención, y sigue a `next` si se cumple o a `otherwise`.          | `answer_key`, `operator` (`equals`, `contains`, `exists`), `value`; o `business_hours`. Y `otherwise` |
| `wait`               | Espera antes del paso siguiente, hasta 7 días.                                                                   | `seconds`                                                                                             |
| `assign_user`        | Asigna la conversación a un miembro y sigue en `next`.                                                           | `user_id`                                                                                             |
| `assign_agent`       | Pone un agente IA en la conversación y sigue en `next`.                                                          | `agent_id`                                                                                            |
| `close_conversation` | Cierra la conversación y termina el flujo.                                                                       |                                                                                                       |
| `end`                | Termina el flujo.                                                                                                |                                                                                                       |
| `answer_call`        | Solo en `call_received`: el agente IA contesta la llamada. No reasigna la conversación. Termina el flujo.        | `agent_id`                                                                                            |
| `decline_call`       | Solo en `call_received`: Ricky rechaza la llamada y envía el texto al WhatsApp de quien llamó. Termina el flujo. | `text`                                                                                                |

Un workflow `call_received` escucha solo números de WhatsApp con llamadas con IA activadas y su flujo admite solo `answer_call`, `decline_call` y `branch` con `business_hours`. El primero activo cuyo canal, `condition` y ramas llegan a uno de esos pasos decide, aunque una persona tenga la conversación; sin él, contesta el agente que tiene la conversación de quien llama.

### Horario de atención

`business_hours` es el mismo objeto en una `condition` y en un `branch`:

* `timezone`: una zona horaria IANA, como `America/Panama`.
* `days`: cada día de la semana (`monday` a `sunday`) con hasta 3 franjas `{ "start": "HH:MM", "end": "HH:MM" }`, en orden. Un día que falta o vacío está cerrado. Una franja nunca cruza la medianoche: `end` va después de `start`, y `24:00` es el final del día; un turno de noche son dos franjas en dos días.
* `closed_dates`: fechas cerradas aunque su día de la semana abra, como los feriados, `YYYY-MM-DD`.

Un `branch` con `business_hours` sigue a `next` si el negocio está abierto en el momento en que corre el paso, y a `otherwise` si no. Así los chats nuevos van al equipo en horario y a un agente de IA el resto del tiempo:

```json
{
  "entry": "horario",
  "steps": [
    { "id": "horario", "kind": "branch", "business_hours": { "timezone": "America/Panama", "days": { "monday": [{ "start": "08:00", "end": "17:00" }], "saturday": [{ "start": "08:00", "end": "13:00" }] } }, "next": "equipo", "otherwise": "agente" },
    { "id": "equipo", "kind": "assign_user", "user_id": "2d4f6a8c-1b3d-4e5f-8a7b-9c0d1e2f3a4b", "next": null },
    { "id": "agente", "kind": "assign_agent", "agent_id": "7e8f9a0b-1c2d-4e3f-a4b5-c6d7e8f9a0b1", "next": null }
  ]
}
```

Antes del horario por día, `business_hours` era una sola franja para varios días: `start`, `end` y `weekdays` (0 para domingo a 6 para sábado). Las solicitudes la siguen aceptando; si llega `days`, esos campos se ignoran. Las respuestas traen `days` y `closed_dates`, y también `start`, `end` y `weekdays`, exactos cuando todos los días abiertos tienen el mismo horario y obsoletos.

Los mensajes de un workflow son texto libre. Por eso solo llegan dentro de la ventana de respuesta del canal; en WhatsApp, 24 horas desde el último mensaje del contacto.

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

Un workflow programado envía una plantilla de WhatsApp cada día desde Odoo: recordatorios de citas o saludos de cumpleaños. Se configura en Ricky; con la API también puedes definir su archivo de encabezado y, en los recordatorios de citas, ver qué enviará y qué envió.

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

Un workflow no lo puede hacer. Ricky no inicia un workflow desde tu sistema, sus pasos no envían plantillas y no revisan etiquetas. Hazlo con la API desde tu sistema:

1. **Envía la plantilla.** Llama a `POST /conversations` con el teléfono y la plantilla `pedido_listo`. Usa `Idempotency-Key: pedido-10482-listo`. Guarda `conversation_id` de la respuesta. Consulta [Enviar mensajes](./sending-messages.md).
2. **Programa la revisión.** En tu sistema, agenda una tarea para dentro de 3 días con el número de pedido y `conversation_id`.
3. **Revisa la etiqueta.** Cuando corre la tarea, lee la conversación con `GET /conversations/{conversation_id}` para obtener `contact.id`. Luego lee el contacto con `GET /contacts/{contact_id}` y busca la etiqueta `retirado` en `tags`. Tu equipo la aplica en Ricky cuando el cliente retira; tu sistema también puede aplicarla con `PATCH /contacts/{contact_id}` y `tag_ids`.
4. **Envía el recordatorio.** Si no tiene la etiqueta, llama a `POST /conversations/{conversation_id}/messages` con `type: "template"` y la plantilla `pedido_recordatorio`. Usa `Idempotency-Key: pedido-10482-recordatorio`, para que un reintento no lo envíe dos veces.

Una plantilla se puede enviar en cualquier momento, aunque la ventana de respuesta esté cerrada.
