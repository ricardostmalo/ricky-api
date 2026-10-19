# Campañas

URL: https://getricky.ai/docs/api/broadcasts

> Envía una plantilla aprobada de WhatsApp a muchos números, ahora o a una hora fijada, y sigue cada entrega.

Una campaña envía una plantilla aprobada de WhatsApp a muchos números, como **WhatsApp → Campañas** en Ricky. Leer y previsualizar una audiencia exigen el permiso `broadcasts:read`; crear y cancelar exigen `broadcasts:write`.

| Operación                                   | Qué hace                                                       |
| ------------------------------------------- | -------------------------------------------------------------- |
| `GET /broadcasts`                           | Campañas de la más reciente a la más antigua, con sus conteos. |
| `POST /broadcasts`                          | Crea una campaña que se envía ahora o en `scheduled_at`.       |
| `POST /broadcasts/preview`                  | Cuenta a cuántos números llega una audiencia, sin crear nada.  |
| `GET /broadcasts/{broadcast_id}`            | Una campaña con sus conteos de entrega.                        |
| `POST /broadcasts/{broadcast_id}/cancel`    | Cancela una campaña programada antes de que empiece.           |
| `GET /broadcasts/{broadcast_id}/recipients` | Cada número y el estado de su mensaje, con filtro por estado.  |

## 1. Elige el canal y la plantilla

`channel_id` es un canal de WhatsApp de `GET /channels`. `template.id` es una plantilla de `GET /templates` con estado `APPROVED`; `template.components` llena sus variables igual que al [enviar una plantilla](./sending-messages.md). Las variables que la plantilla asocia a campos de contacto en Ricky se llenan para cada contacto.

Para llenar una variable con los datos de cada destinatario, envía `mappings`, como hace el editor de campañas en Ricky:

```json
"mappings": [
  { "component": "body", "key": "1", "source": { "type": "contact", "field": "first_name" } },
  { "component": "body", "key": "2", "source": { "type": "custom_field", "field_id": "3c9d…" } }
]
```

`key` es el número o el nombre de la variable; para un botón de URL, el índice del botón. `source` es un campo del contacto (`first_name`, `company`, `city`, …) o un campo personalizado de `GET /contact-fields`. Ricky guarda las asociaciones en la plantilla y reemplaza las que tenía, así que las próximas campañas de esa plantilla también las usan. Omite `mappings` para mantener las guardadas; envía `[]` para borrarlas. Un destinatario sin contacto, o con el campo vacío, recibe el texto que enviaste en `template.components`. Un `field_id` de otra organización recibe `404 not_found` con `param: "mappings"`.

## 2. Elige la audiencia

* `{ "type": "filter", "tag_id": "…", "lifecycle_stage": "customer", "query": "…" }`: todos los contactos que cumplen todos los filtros que envíes. Sin filtros, todos los contactos.
* `{ "type": "contacts", "contact_ids": ["…"] }`: los contactos que indiques, hasta 1.000. Un contacto de otra organización recibe `404 not_found`.
* `{ "type": "phones", "phones": ["+50760001234"] }`: números con código de país, hasta 2.000.

Ricky fija la lista de destinatarios al crear la campaña. Usa el teléfono de cada contacto, o su número de WhatsApp, omite los contactos sin número y envía una vez por número, hasta 5.000. Una audiencia sin ningún número recibe `422 rule_violation`.

Para saber el tamaño antes de crearla, envía la misma `audience` a `POST /broadcasts/preview`:

```bash
curl https://getricky.ai/api/v1/broadcasts/preview \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "audience": { "type": "filter", "tag_id": "5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d" } }'
```

Responde `{ "data": { "recipients": 118, "skipped": 3 } }`: los números a los que iría ahora y los contactos o números que quedan fuera por no tener un número de WhatsApp válido. No crea nada, y la lista puede cambiar antes de que crees la campaña.

## 3. Envía ahora o programa

```bash
curl https://getricky.ai/api/v1/broadcasts \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: promo-octubre-2026" \
  -d '{
    "channel_id": "8f3c2a5e-6b1d-4c7a-9e2f-1a2b3c4d5e6f",
    "template": {
      "id": "1234567890",
      "components": [{ "type": "body", "parameters": [{ "type": "text", "text": "20%" }] }]
    },
    "audience": { "type": "filter", "tag_id": "5a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d" },
    "scheduled_at": "2026-10-20T14:00:00Z"
  }'
```

La respuesta es `201` con la campaña. Sin `scheduled_at` queda `queued` y empieza de inmediato. Con él queda `scheduled` hasta esa hora, que debe ser futura y como máximo 7 días después. Ricky revisa la plantilla en Meta al crear la campaña.

## 4. Cancela una campaña programada

`POST /broadcasts/{broadcast_id}/cancel` sin cuerpo pasa una campaña `scheduled` a `canceled`; no se envía nada. Si ya está `queued`, enviándose o terminada, o ya cancelada, la respuesta es `409 conflict`.

## 5. Sigue las entregas

`status` pasa de `scheduled` o `queued` a `sending` y a `completed`, cuando todos los mensajes se entregaron a WhatsApp. `counts` dice cuántos destinatarios hay en cada estado de entrega:

| Estado      | Significado                                                    |
| ----------- | -------------------------------------------------------------- |
| `pending`   | Aún no se envió, o WhatsApp aún no respondió.                  |
| `sent`      | WhatsApp lo aceptó, aún no se entregó.                         |
| `delivered` | Se entregó al teléfono, aún no se leyó.                        |
| `read`      | El destinatario lo leyó.                                       |
| `failed`    | No se entregó; `failure_reason` del destinatario dice por qué. |

`GET /broadcasts/{broadcast_id}/recipients?status=failed` lista los números en un estado, por número, con la conversación y el mensaje que recibió cada uno. Los estados cambian según los reporta WhatsApp; vuelve a leer para verlos avanzar. Ambas listas usan [paginación por cursor](./pagination.md).

Para saber cuándo se entrega o se lee un mensaje sin preguntar, suscríbete a los [webhooks](./webhooks.md) `message.delivered`, `message.read` y `message.failed`: cada mensaje de una campaña es un mensaje de su conversación.
