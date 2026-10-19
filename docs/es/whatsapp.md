# Plantillas y números de WhatsApp

URL: https://getricky.ai/docs/api/whatsapp

> Crea, valida, edita y elimina plantillas de WhatsApp, sigue la revisión de Meta y consulta el estado de tus números.

Las plantillas son los mensajes que Meta aprueba para escribirle a un cliente fuera de la ventana de 24 horas. La API usa las mismas reglas del editor de plantillas de Ricky y lee cada plantilla de Meta en el momento.

La clave necesita `templates:read` para leer y validar, y `templates:write` para crear, editar o eliminar. Los números de WhatsApp se leen con `conversations:read`.

## Valida un borrador

`POST /templates/validate` revisa un borrador sin enviarlo a Meta. Úsalo antes de crear una plantilla.

```bash
curl https://getricky.ai/api/v1/templates/validate \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel_id": "8f3c2a5e-6b1d-4c7a-9e2f-1a2b3c4d5e6f",
    "name": "pedido_listo",
    "language": "es",
    "category": "UTILITY",
    "parameter_format": "POSITIONAL",
    "body": {
      "text": "Hola {{1}}, tu pedido {{2}} está listo para retirar.",
      "examples": { "1": "Ana", "2": "10482" }
    },
    "footer": "Casa Nativa",
    "buttons": [{ "type": "QUICK_REPLY", "text": "Gracias" }]
  }'
```

La respuesta es `200`. Si el borrador está bien, trae `valid: true` y los `components` que Ricky enviaría a Meta. Si algo falla, trae `valid: false` y en `errors` cada problema con el campo (`param`) y qué cambiar (`message`).

Un cuerpo que no es un borrador, por ejemplo sin `body`, recibe `400 invalid_input`. Meta todavía puede rechazar un borrador válido en su revisión.

## Crea una plantilla

`POST /templates` acepta el mismo cuerpo, con `channel_id` obligatorio: la plantilla queda en la cuenta de negocio de ese número. Usa `Idempotency-Key` para que un reintento no la envíe dos veces.

* `parameter_format`: `NAMED` (`{{nombre}}`) o `POSITIONAL` (`{{1}}`). No cambia después.
* `header`: `TEXT` o `LOCATION`, o `null`.
* `body.examples`: un ejemplo por variable. Meta los revisa.
* `buttons`: respuestas rápidas, hasta dos enlaces y un teléfono.

La respuesta es `201` con la plantilla, casi siempre en `status: "PENDING"`. Si el borrador rompe una regla, la respuesta es `400 invalid_input` con el primer problema. Si Meta lo rechaza, la respuesta es `422 rule_violation` con su motivo.

## Sigue la revisión de Meta

`GET /templates/{template_id}` lee la plantilla de Meta. Su `status` es `PENDING` mientras Meta la revisa, y luego `APPROVED`, `REJECTED` o `PAUSED`. Solo una plantilla `APPROVED` se puede enviar. Consulta [Enviar mensajes](./sending-messages.md).

`GET /templates` lista las plantillas de todas tus cuentas de negocio.

## Edita y elimina

`PATCH /templates/{template_id}` cambia solo lo que envías: `category`, `header`, `body`, `footer` o `buttons` (reemplaza todos los botones). El nombre, el idioma y `parameter_format` no cambian. Ricky envía la plantilla editada a revisión otra vez.

Meta solo permite editar plantillas `APPROVED`, `REJECTED` o `PAUSED`, y limita cuántas veces cambia una aprobada. Si no lo permite, la respuesta es `422 rule_violation`. Las plantillas con encabezado de imagen, video o documento, o con botones que el editor de Ricky no arma, no se editan por la API.

`DELETE /templates/{template_id}` elimina la plantilla en Meta. Meta la borra en todos los idiomas con ese nombre, y el nombre no se puede usar otra vez por 30 días.

## Números de WhatsApp

`GET /whatsapp-numbers` lista los números de la organización, también los desconectados. `GET /whatsapp-numbers/{channel_id}` lee uno.

Cada número trae lo mismo que muestra la configuración de WhatsApp en Ricky:

| Campo              | Qué es                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `status`           | Estado del número en Meta, por ejemplo `CONNECTED`.                                                        |
| `messaging_health` | Si Meta deja enviar: `available`, `limited` o `blocked`.                                                   |
| `quality_rating`   | Calidad en Meta: `green`, `yellow`, `red`, `not_yet_determined` o `unknown`.                               |
| `messaging_limit`  | Límite de mensajes en Meta, por ejemplo `TIER_1K` o `TIER_UNLIMITED`; `UNKNOWN` hasta que Meta lo informe. |
| `last_synced_at`   | Cuándo Ricky leyó estos datos de Meta por última vez.                                                      |
