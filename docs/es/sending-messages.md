# Enviar mensajes

URL: https://getricky.ai/docs/api/sending-messages

> Inicia conversaciones de WhatsApp con plantillas, sigue cada envío y responde con texto o archivos dentro de la ventana de respuesta.

Esta guía recorre el flujo de un sistema de negocio, por ejemplo un ERP que avisa a un cliente que sus lentes están listos:

1. Elegir el canal y la plantilla.
2. Enviar la plantilla al teléfono del cliente.
3. Seguir el envío.
4. Recibir la respuesta del cliente.
5. Responder con texto mientras la ventana está abierta.
6. Enviar un archivo.

La clave necesita los permisos `conversations:read`, `templates:read` y `messages:send`.

## 1. Elige el canal y la plantilla

Lista los canales y toma el `id` del número de WhatsApp desde el que vas a escribir.

```bash
curl https://getricky.ai/api/v1/channels \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

```json title="200 OK"
{
  "data": [
    {
      "id": "0b6f2c1e-7d4a-4c8e-9f3b-2a1d5e6c7b80",
      "type": "whatsapp",
      "name": "Óptica Central",
      "address": "+50720001000",
      "whatsapp_business_account_id": "102938475610293",
      "connected_at": "2026-09-02T14:10:00.000Z"
    }
  ],
  "next_cursor": null
}
```

Lista las plantillas. Ricky las lee de Meta en el momento.

```bash
curl https://getricky.ai/api/v1/templates \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

```json title="200 OK"
{
  "data": [
    {
      "id": "1478523690147852",
      "name": "pedido_listo",
      "language": "es",
      "category": "UTILITY",
      "status": "APPROVED",
      "whatsapp_business_account_id": "102938475610293",
      "parameter_format": "POSITIONAL",
      "components": [
        {
          "type": "BODY",
          "text": "Hola {{1}}, tus lentes están listos en {{2}}. Puedes retirarlos desde el {{3}}."
        },
        {
          "type": "FOOTER",
          "text": "Óptica Central"
        }
      ]
    }
  ],
  "next_cursor": null
}
```

Usa una plantilla que cumpla tres condiciones:

* `status` es `APPROVED`. Ricky rechaza las demás con `422 rule_violation`.
* `whatsapp_business_account_id` coincide con el del canal.
* Conoces sus variables: `{{1}}`, `{{2}}`… si `parameter_format` es `POSITIONAL`, o `{{nombre}}` si es `NAMED`.

## 2. Envía la plantilla

`POST /conversations` envía una plantilla a un teléfono. Ricky busca o crea el contacto y reutiliza la conversación de ese número en ese canal. No necesitas crear el contacto antes. `phone` lleva el código de país, por ejemplo `+50760001234`.

```bash
curl https://getricky.ai/api/v1/conversations \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: pedido-48213-listo" \
  -d '{
    "channel_id": "0b6f2c1e-7d4a-4c8e-9f3b-2a1d5e6c7b80",
    "phone": "+50760001234",
    "template": {
      "id": "1478523690147852",
      "components": [
        {
          "type": "body",
          "parameters": [
            { "type": "text", "text": "Ana" },
            { "type": "text", "text": "Óptica Central Costa del Este" },
            { "type": "text", "text": "viernes 16 de octubre" }
          ]
        }
      ]
    }
  }'
```

```json title="202 Accepted"
{
  "data": {
    "id": "8f0c2d4e-6a1b-4c3d-8e9f-0a1b2c3d4e5f",
    "conversation_id": "3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09",
    "status": "queued",
    "message_id": null,
    "failure_reason": null,
    "created_at": "2026-10-14T15:30:02.118Z"
  }
}
```

`202` significa que Ricky aceptó el envío y lo puso en cola. Todavía no significa que WhatsApp lo aceptó. Guarda `id` (el ID del envío) y `conversation_id`.

Deriva la `Idempotency-Key` de un dato tuyo, como el número de pedido. Así, si tu sistema se reinicia y repite el envío, Ricky no manda el mensaje dos veces. Consulta [Idempotencia](./idempotency-and-rate-limits.md).

### Variables de la plantilla

`components` usa el formato de la API de WhatsApp Cloud. Cada elemento llena las variables de una parte de la plantilla:

| `type`   | Uso                                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------------------- |
| `header` | Variables del encabezado: texto, o un archivo `image`, `video` o `document` con su `link` HTTPS público.       |
| `body`   | Variables del cuerpo, en orden.                                                                                |
| `button` | Variables de un botón. Indica `sub_type` (`url` o `quick_reply`) e `index`, la posición del botón desde `"0"`. |

En una plantilla `NAMED`, cada parámetro de texto lleva `parameter_name`:

```json
{
  "type": "body",
  "parameters": [{ "type": "text", "parameter_name": "nombre", "text": "Ana" }]
}
```

Un encabezado con imagen y un botón con URL variable:

```json
[
  {
    "type": "header",
    "parameters": [{ "type": "image", "image": { "link": "https://example.com/lentes.jpg" } }]
  },
  {
    "type": "button",
    "sub_type": "url",
    "index": "0",
    "parameters": [{ "type": "text", "text": "48213" }]
  }
]
```

Una plantilla sin variables se envía con `"components": []` o sin `components`.

### Errores frecuentes

| Respuesta            | Causa                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `404 not_found`      | El canal no existe, está desconectado, o la plantilla no existe.                                                                 |
| `422 rule_violation` | El canal no es de WhatsApp, o la plantilla no está `APPROVED`.                                                                   |
| `502 upstream_error` | Ricky no pudo leer las plantillas en Meta. Sigue [Estado desconocido](./idempotency-and-rate-limits.md#estado-desconocido). |

## 3. Sigue el envío

Consulta el envío con su `id`:

```bash
curl https://getricky.ai/api/v1/sends/8f0c2d4e-6a1b-4c3d-8e9f-0a1b2c3d4e5f \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

```json title="200 OK"
{
  "data": {
    "id": "8f0c2d4e-6a1b-4c3d-8e9f-0a1b2c3d4e5f",
    "conversation_id": "3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09",
    "status": "sent",
    "message_id": "a7e5c3b1-9d8f-4a6e-b2c4-1d3f5e7a9b0c",
    "failure_reason": null,
    "created_at": "2026-10-14T15:30:02.118Z"
  }
}
```

| `status` | Significado                                                              |
| -------- | ------------------------------------------------------------------------ |
| `queued` | Ricky todavía lo está entregando al proveedor y reintenta si hace falta. |
| `sent`   | El proveedor aceptó el mensaje.                                          |
| `failed` | Falló de forma definitiva. `failure_reason` explica la causa.            |

Consulta con espera creciente, por ejemplo a los 2, 4 y 8 segundos, hasta que el estado deje de ser `queued`.

Cuando el estado es `sent`, `message_id` es el mensaje en la conversación: el mismo `id` que muestra la lista de mensajes y que trae el webhook `message.sent`.

`sent` no significa entregado ni leído. Para eso, lee el mensaje con `GET /conversations/{conversation_id}/messages/{message_id}`: cada mensaje saliente trae su `status`, por ejemplo `sent`, `delivered`, `read` o `failed`, y las horas `sent_at`, `delivered_at` y `read_at`.

## 4. Recibe la respuesta

Suscribe un webhook al evento `message.received`. Consulta [Webhooks](./webhooks.md).

```json title="Evento message.received"
{
  "id": "5b8e0f3a-2c51-4b8e-9d0e-6f1a2b3c4d5e",
  "type": "message.received",
  "occurred_at": "2026-10-14T15:42:10.000Z",
  "organization_id": "0d9c4b7e-1f2a-4c3d-8e5f-6a7b8c9d0e1f",
  "data": {
    "conversation_id": "3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09",
    "message_id": "a7e5c3b1-9d8f-4a6e-b2c4-1d3f5e7a9b0c"
  }
}
```

Ricky envía el evento en cuanto llega el mensaje, normalmente en pocos segundos.

El evento no trae el texto. Lee el mensaje con su `message_id`:

```bash
curl https://getricky.ai/api/v1/conversations/3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09/messages/a7e5c3b1-9d8f-4a6e-b2c4-1d3f5e7a9b0c \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

```json title="200 OK"
{
  "data": {
    "id": "a7e5c3b1-9d8f-4a6e-b2c4-1d3f5e7a9b0c",
    "conversation_id": "3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09",
    "direction": "inbound",
    "type": "text",
    "text": "Gracias, paso el viernes en la tarde.",
    "sender": { "type": "contact", "name": null },
    "status": "delivered",
    "media": null,
    "provider_message_id": "wamid.HBgLNTA3NjAwMDEyMzQVAgASGBQzRUIwRDFCMkM0RTZGOEEwQjlDMgA=",
    "created_at": "2026-10-14T15:42:11.204Z",
    "sent_at": "2026-10-14T15:42:10.000Z",
    "delivered_at": null,
    "read_at": null,
    "failed_at": null,
    "edited_at": null,
    "deleted_at": null
  }
}
```

Si el mensaje trae un archivo, `media.url` es un enlace firmado que vale una hora. Ricky lo firma de nuevo en cada lectura. Es `null` mientras Ricky no haya descargado el archivo.

Para leer toda la conversación, lista sus mensajes con `GET /conversations/{conversation_id}/messages`. La lista empieza por el más reciente.

## 5. Responde con texto

Mientras la ventana de WhatsApp está abierta, responde con texto en la misma conversación. La ventana dura 24 horas desde el último mensaje del cliente.

```bash
curl https://getricky.ai/api/v1/conversations/3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09/messages \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: pedido-48213-respuesta-1" \
  -d '{ "type": "text", "text": "Perfecto, Ana. Te esperamos el viernes." }'
```

La respuesta es `202` con un envío, igual que en el paso 2. Síguelo con `GET /sends/{send_id}`.

Con la ventana cerrada, Ricky responde `422 outside_messaging_window`:

```json title="422 Unprocessable Entity"
{
  "error": {
    "code": "outside_messaging_window",
    "message": "…",
    "request_id": "7c1e9a3b-5d2f-4e8a-b6c0-1f3d5a7b9e2c"
  }
}
```

En ese caso, envía una plantilla en la misma conversación:

```bash
curl https://getricky.ai/api/v1/conversations/3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09/messages \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: pedido-48213-recordatorio" \
  -d '{
    "type": "template",
    "template": {
      "id": "1478523690147852",
      "components": [
        {
          "type": "body",
          "parameters": [
            { "type": "text", "text": "Ana" },
            { "type": "text", "text": "Óptica Central Costa del Este" },
            { "type": "text", "text": "viernes 16 de octubre" }
          ]
        }
      ]
    }
  }'
```

Las plantillas solo existen en WhatsApp: en una conversación de Instagram o Messenger, una plantilla recibe `422 rule_violation`. En esos canales se envía texto dentro de la ventana de respuesta de cada uno. El texto admite hasta 4096 caracteres; en Messenger, hasta 2000.

## 6. Envía un archivo

Dentro de la ventana de respuesta, envía una imagen, un video, un audio o un documento. Publica el archivo en una URL HTTPS pública. Ricky lo descarga antes de responder y se lo envía al cliente.

```bash
curl https://getricky.ai/api/v1/conversations/3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09/messages \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: pedido-48213-factura" \
  -d '{
    "type": "media",
    "media": {
      "url": "https://example.com/pedidos/48213/factura.pdf",
      "kind": "document",
      "caption": "Factura del pedido 48213",
      "filename": "factura-48213.pdf"
    }
  }'
```

La respuesta es `202` con un envío, igual que con texto.

| Campo      | Regla                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| `url`      | HTTPS pública en el puerto 443, con nombre de host. Ricky no sigue redirecciones.                    |
| `kind`     | `image`, `video`, `audio` o `document`. El `Content-Type` del archivo debe ser un tipo de esa clase. |
| `caption`  | Hasta 1024 caracteres. Solo en WhatsApp y nunca en audio.                                            |
| `filename` | El nombre que ve el cliente en un documento. Sin él, Ricky usa el último segmento de `url`.          |

Tipos y tamaños que acepta cada canal:

| `kind`     | WhatsApp                                     | Instagram                    |
| ---------- | -------------------------------------------- | ---------------------------- |
| `image`    | JPEG o PNG, hasta 5 MB.                      | JPEG, PNG o GIF, hasta 8 MB. |
| `video`    | MP4 o 3GP, hasta 16 MB.                      | MP4 o MOV, hasta 25 MB.      |
| `audio`    | AAC, MP3, M4A, OGG u Opus, hasta 16 MB.      | AAC, M4A o WAV, hasta 25 MB. |
| `document` | PDF, Word, Excel o PowerPoint, hasta 100 MB. | PDF, hasta 25 MB.            |

Ricky rechaza el archivo con `400 invalid_input` y `param: "media.url"` cuando la URL no es pública, el host redirige o no responde `2xx` en 30 segundos, o el tipo o el tamaño no cumplen la tabla. Messenger no acepta archivos por la API: un archivo ahí recibe `422 rule_violation`. Fuera de la ventana de WhatsApp, un archivo recibe `422 outside_messaging_window`, igual que el texto.
