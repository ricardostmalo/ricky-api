# Webhooks

URL: https://getricky.ai/docs/api/webhooks

> Recibe eventos firmados de Ricky, verifícalos y procesa cada uno una sola vez.

Un webhook es una URL de tu sistema a la que Ricky envía un `POST` cuando ocurre un evento en la organización. Ricky firma cada entrega y la reintenta si falla.

La clave necesita el permiso `webhooks:manage`.

## Crea un webhook

```bash
curl https://getricky.ai/api/v1/webhooks \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://erp.example.com/webhooks/ricky",
    "event_types": ["message.received", "conversation.closed"]
  }'
```

```json title="201 Created"
{
  "data": {
    "id": "e2c4a6b8-0d1f-4e3a-9b5c-7d9f1a3c5e7b",
    "url": "https://erp.example.com/webhooks/ricky",
    "event_types": ["message.received", "conversation.closed"],
    "status": "active",
    "created_at": "2026-10-14T15:00:00.000Z",
    "disabled_at": null,
    "signing_secret": "whsec_…"
  }
}
```

Guarda `signing_secret` en tu gestor de secretos. Ricky solo lo muestra en esta respuesta.

La URL debe cumplir estas condiciones. Si no, la respuesta es `400 invalid_input` con `param: "url"`.

* Usa HTTPS en el puerto 443.
* Usa un nombre de dominio, no una dirección IP.
* No lleva usuario ni contraseña.
* El dominio resuelve a direcciones públicas.

Ricky vuelve a comprobar la URL en cada entrega y no sigue redirecciones.

## Eventos

| Evento                            | Ocurre cuando                                                                                     | `data`                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `message.received`                | Un contacto envía un mensaje.                                                                     | `conversation_id`, `message_id`        |
| `message.sent`                    | El proveedor acepta un mensaje de la organización.                                                | `conversation_id`, `message_id`        |
| `message.delivered`               | Un mensaje saliente llega al teléfono del destinatario.                                           | `conversation_id`, `message_id`        |
| `message.read`                    | El destinatario lee un mensaje saliente.                                                          | `conversation_id`, `message_id`        |
| `message.failed`                  | Un mensaje saliente falla de forma definitiva.                                                    | `conversation_id`, `message_id`        |
| `conversation.opened`             | Se crea o se reabre una conversación.                                                             | `conversation_id`                      |
| `conversation.closed`             | Se cierra una conversación.                                                                       | `conversation_id`                      |
| `conversation.assignment_changed` | Se asigna, se reasigna o se quita la asignación de una conversación.                              | `conversation_id`                      |
| `conversation.agent_changed`      | Se asigna, se cambia o se quita el agente de IA que responde una conversación.                    | `conversation_id`                      |
| `conversation.handoff_requested`  | Un agente de IA pasa una conversación a una persona.                                              | `conversation_id`                      |
| `conversation.handoff_resolved`   | Una persona resuelve el traspaso: la conversación sigue con una persona o vuelve al agente de IA. | `conversation_id`                      |
| `contact.created`                 | Se crea un contacto: en Ricky, por la API o con su primer mensaje.                                | `contact_id`                           |
| `contact.updated`                 | Se guarda un contacto: sus campos, etiquetas o valores.                                           | `contact_id`                           |
| `contact.tags_changed`            | Un contacto gana o pierde una etiqueta.                                                           | `contact_id`                           |
| `broadcast.completed`             | Una campaña entrega su último mensaje a WhatsApp.                                                 | `broadcast_id`                         |
| `broadcast.failed`                | Una campaña termina y todos sus destinatarios fallaron.                                           | `broadcast_id`                         |
| `template.status_changed`         | Meta cambia el estado de una plantilla de WhatsApp: aprobada, rechazada, pausada y otros.         | `template_id`                          |
| `workflow.execution_failed`       | Una ejecución de un workflow falla de forma definitiva.                                           | `workflow_id`, `workflow_execution_id` |
| `knowledge_file.ready`            | Ricky termina de leer un archivo de conocimiento subido.                                          | `knowledge_file_id`                    |

`message.sent` llega por cada mensaje saliente, no solo por los enviados con la API. Una importación de historial no genera eventos `message.*`, ni cambios de agente, traspasos o cambios de etiquetas. Para la causa de un `message.failed`, lee el mensaje.

* **Asignación y agente.** Un cambio del agente de IA genera `conversation.assignment_changed` y `conversation.agent_changed`. Un cambio entre personas genera solo el primero.
* **Etiquetas.** Las etiquetas son del contacto, también cuando las cambias en una conversación. Todas las etiquetas que cambia un mismo guardado son un solo `contact.tags_changed`. Cada guardado genera además `contact.updated`, aunque no cambie nada.
* **Campañas.** Una campaña genera uno de los dos, una sola vez. `broadcast.completed` no significa entregada: algunos destinatarios pueden seguir esperando a WhatsApp. Para los conteos, consulta la campaña.
* **Plantillas.** El evento llega a cada organización cuyo número de WhatsApp usa la cuenta de negocio de la plantilla. Consulta el estado con `GET /templates/{template_id}`.
* **Workflows.** Una ejecución es una fila de `GET /workflows/{workflow_id}/executions`; su `last_error` dice por qué falló.
* **Archivos de conocimiento.** Un archivo que Ricky no pudo leer también queda listo, con `extraction_error`; no hay evento de fallo.

El evento solo trae IDs. Para el contenido, lee el recurso con la API: [Get a conversation](https://getricky.ai/docs/api/reference/conversations/get-conversation) o [List messages](https://getricky.ai/docs/api/reference/messages/list-messages).

## La entrega

```http
POST /webhooks/ricky HTTP/1.1
Host: erp.example.com
Content-Type: application/json
User-Agent: Ricky-Webhooks/1.0
X-Ricky-Delivery-Id: 5b8e0f3a-2c51-4b8e-9d0e-6f1a2b3c4d5e
X-Ricky-Timestamp: 1791992702
X-Ricky-Signature: v1=c4a06466fda49cd8401f485eb542ba41573b96f321758a2376acbffdd44c8ded

{"id":"5b8e0f3a-2c51-4b8e-9d0e-6f1a2b3c4d5e","type":"message.received","occurred_at":"2026-10-14T15:42:10.000Z","organization_id":"0d9c4b7e-1f2a-4c3d-8e5f-6a7b8c9d0e1f","data":{"conversation_id":"3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09","message_id":"a7e5c3b1-9d8f-4a6e-b2c4-1d3f5e7a9b0c"}}
```

| Cabecera              | Valor                                                              |
| --------------------- | ------------------------------------------------------------------ |
| `X-Ricky-Delivery-Id` | ID de la entrega. Es igual al `id` del cuerpo.                     |
| `X-Ricky-Timestamp`   | Hora Unix, en segundos, de este intento. Cambia en cada reintento. |
| `X-Ricky-Signature`   | `v1=` seguido del HMAC-SHA256 en hexadecimal.                      |

| Campo del cuerpo  | Descripción                                                                        |
| ----------------- | ---------------------------------------------------------------------------------- |
| `id`              | ID de la entrega. Úsalo para descartar duplicados.                                 |
| `type`            | Tipo de evento.                                                                    |
| `occurred_at`     | Cuándo ocurrió, en ISO 8601 UTC.                                                   |
| `organization_id` | Organización del evento.                                                           |
| `data`            | Los IDs de aquello de lo que trata el evento, como los indica [Eventos](#eventos). |

## Verifica la firma

Verifica cada entrega antes de usarla:

1. Lee el cuerpo crudo, en bytes, antes de convertirlo a JSON. Un cuerpo re-serializado no coincide.
2. Rechaza la entrega si `X-Ricky-Timestamp` difiere de tu reloj en más de 5 minutos.
3. Calcula el HMAC-SHA256 de `<X-Ricky-Timestamp>.<cuerpo crudo>`. La clave es el `signing_secret` completo, con el prefijo `whsec_`.
4. Compara el resultado en hexadecimal con lo que sigue a `v1=`, en tiempo constante. Durante una rotación del secreto la cabecera trae dos firmas separadas por coma: acepta la entrega si cualquiera coincide.

**Node.js**

```js
import { createHmac, timingSafeEqual } from 'node:crypto';
import express from 'express';

const SECRET = process.env.RICKY_WEBHOOK_SECRET; // whsec_…
const TOLERANCE_SECONDS = 5 * 60;

export function verifyRickySignature(rawBody, timestamp, signature, secret = SECRET) {
  if (!timestamp || !signature) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!(age <= TOLERANCE_SECONDS)) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest();
  // During a secret rotation the header carries two comma-separated signatures.
  return signature.split(',').some((candidate) => {
    if (!candidate.startsWith('v1=')) return false;
    const received = Buffer.from(candidate.slice(3), 'hex');
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

const app = express();

// express.raw() keeps the body as bytes, exactly as Ricky signed it.
app.post('/webhooks/ricky', express.raw({ type: 'application/json' }), async (req, res) => {
  const valid = verifyRickySignature(
    req.body,
    req.get('X-Ricky-Timestamp'),
    req.get('X-Ricky-Signature'),
  );
  if (!valid) return res.sendStatus(401);
  const event = JSON.parse(req.body.toString('utf8'));
  await saveEventOnce(event); // your code: store it with event.id as a unique key
  res.sendStatus(204);
});
```

**Python**

```python
import hashlib
import hmac
import json
import os
import time

from flask import Flask, request

SECRET = os.environ["RICKY_WEBHOOK_SECRET"].encode()  # whsec_…
TOLERANCE_SECONDS = 5 * 60

def verify_ricky_signature(
    raw_body: bytes, timestamp: str | None, signature: str | None, secret: bytes = SECRET
) -> bool:
    if not timestamp or not signature:
        return False
    try:
        age = abs(time.time() - int(timestamp))
    except ValueError:
        return False
    if age > TOLERANCE_SECONDS:
        return False
    expected = hmac.new(secret, timestamp.encode() + b"." + raw_body, hashlib.sha256).hexdigest()
    # During a secret rotation the header carries two comma-separated signatures.
    return any(
        candidate.startswith("v1=") and hmac.compare_digest(expected.encode(), candidate[3:].encode())
        for candidate in signature.split(",")
    )

app = Flask(__name__)

@app.post("/webhooks/ricky")
def ricky_webhook():
    raw_body = request.get_data()  # the bytes Ricky signed
    if not verify_ricky_signature(
        raw_body,
        request.headers.get("X-Ricky-Timestamp"),
        request.headers.get("X-Ricky-Signature"),
    ):
        return "", 401
    event = json.loads(raw_body)
    save_event_once(event)  # your code: store it with event["id"] as a unique key
    return "", 204
```

### Prueba tu verificación

Con estos valores exactos, el HMAC debe coincidir. La comprobación de los 5 minutos falla con esta hora, así que pruébala aparte o fija el reloj en tu prueba.

| Dato      | Valor                                                                                     |
| --------- | ----------------------------------------------------------------------------------------- |
| Secreto   | `whsec_test_5YtV0kq9mUz2Rr8Lw3Nf1Hc6Pb4Xa7Ds0Ge2Jo9Ki8`                                   |
| Timestamp | `1791992702`                                                                              |
| Cuerpo    | El cuerpo del ejemplo de [La entrega](#la-entrega), sin espacios ni salto de línea final. |
| Firma     | `v1=c4a06466fda49cd8401f485eb542ba41573b96f321758a2376acbffdd44c8ded`                     |

## Responde

* Responde con cualquier estado `2xx` en menos de 10 segundos. Ricky corta la conexión a los 10 segundos y lo cuenta como fallo.
* Guarda el evento y responde. Haz el trabajo pesado después, fuera de la solicitud.
* Una redirección, un estado distinto de `2xx`, un error de red o una respuesta de más de 64 KiB cuentan como fallo.

## Cadencia y reintentos

Ricky envía cada evento en cuanto ocurre, normalmente en pocos segundos.

Si un intento falla, Ricky espera antes del siguiente: al menos 30 segundos después del primer fallo, y el doble cada vez, hasta un máximo de 1 hora. Cada reintento sale a su hora. Tras 10 intentos fallidos, la entrega queda en `failed`.

## Duplicados y orden

* Una misma entrega puede llegar más de una vez, por ejemplo si tu servidor respondió después de los 10 segundos. Descarta duplicados por `id`.
* Las entregas pueden llegar en otro orden que los eventos. Ordénalas por `occurred_at` y lee el estado actual con la API antes de actuar.

## Registro de entregas

`GET /webhooks/{webhook_id}/deliveries` devuelve las 100 entregas más recientes de un webhook.

```json title="200 OK"
{
  "data": [
    {
      "id": "5b8e0f3a-2c51-4b8e-9d0e-6f1a2b3c4d5e",
      "event_type": "message.received",
      "status": "failed",
      "attempts": 10,
      "last_response_status": 503,
      "last_error": "HTTP 503",
      "created_at": "2026-10-14T15:42:10.000Z",
      "next_attempt_at": "2026-10-15T00:12:41.000Z",
      "delivered_at": null
    }
  ],
  "next_cursor": null
}
```

| `status`     | Significado                                                |
| ------------ | ---------------------------------------------------------- |
| `pending`    | Espera su próximo intento, en `next_attempt_at` o después. |
| `processing` | Ricky la está enviando.                                    |
| `delivered`  | Tu servidor respondió `2xx`.                               |
| `failed`     | Agotó sus 10 intentos.                                     |

## Reintento manual

Después de corregir tu servidor, vuelve a poner en cola una entrega `failed`:

```bash
curl -X POST https://getricky.ai/api/v1/webhooks/e2c4a6b8-0d1f-4e3a-9b5c-7d9f1a3c5e7b/deliveries/5b8e0f3a-2c51-4b8e-9d0e-6f1a2b3c4d5e/retry \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

La entrega vuelve a `pending` con 10 intentos nuevos y sale de inmediato. Solo se reintentan entregas `failed` de un webhook activo; cualquier otra recibe `404 not_found`.

## Desactiva un webhook

`DELETE /webhooks/{webhook_id}` detiene las entregas nuevas y las pendientes. Un webhook desactivado no se puede reactivar: crea otro. Desactivarlo dos veces responde `404 not_found`.

## Envía un evento de prueba

Para comprobar tu endpoint sin esperar un evento real:

```bash
curl -X POST https://getricky.ai/api/v1/webhooks/e2c4a6b8-0d1f-4e3a-9b5c-7d9f1a3c5e7b/test \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

```json title="200 OK"
{
  "data": { "delivered": true, "response_status": 200, "error": null, "duration_ms": 184 }
}
```

Ricky envía al momento un evento `webhook.test`, firmado como cualquier otro, con `data.webhook_id`. La respuesta dice qué contestó tu endpoint. La prueba no queda en el registro de entregas y no se reintenta.

## Rota el secreto

```bash
curl -X POST https://getricky.ai/api/v1/webhooks/e2c4a6b8-0d1f-4e3a-9b5c-7d9f1a3c5e7b/rotate-secret \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"expire_previous_after_hours": 24}'
```

La respuesta trae el `signing_secret` nuevo; Ricky solo lo muestra en esta respuesta. Durante las horas que indiques, de 0 a 72 (24 si no envías cuerpo), cada entrega trae dos firmas: `v1=<nueva>,v1=<anterior>`. Despliega el secreto nuevo en ese plazo; la verificación de arriba acepta cualquiera de las dos. Con `0`, el secreto anterior deja de firmar al momento.
