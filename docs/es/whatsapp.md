# Plantillas y números de WhatsApp

URL: https://getricky.ai/docs/api/whatsapp

> Crea, valida, edita y elimina plantillas de WhatsApp, sigue la revisión de Meta, llena sus variables con campos del contacto y gestiona tus números.

Las plantillas son los mensajes que Meta aprueba para escribirle a un cliente fuera de la ventana de 24 horas. La API usa las mismas reglas del editor de plantillas de Ricky y lee cada plantilla de Meta en el momento.

La clave necesita `templates:read` para leer y validar, y `templates:write` para crear, editar o eliminar, subir muestras de encabezado y asignar variables. Los números de WhatsApp se leen con `conversations:read` y se cambian con `conversations:write`.

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
* `header`: `TEXT`, `IMAGE`, `VIDEO`, `DOCUMENT` o `LOCATION`, o `null`. Un encabezado multimedia necesita una muestra; consulta [Encabezados de imagen, video y documento](#encabezados-de-imagen-video-y-documento).
* `body.examples`: un ejemplo por variable. Meta los revisa.
* `buttons`: respuestas rápidas, hasta dos enlaces y un teléfono.

La respuesta es `201` con la plantilla, casi siempre en `status: "PENDING"`. Si el borrador rompe una regla, la respuesta es `400 invalid_input` con el primer problema. Si Meta lo rechaza, la respuesta es `422 rule_violation` con su motivo.

## Encabezados de imagen, video y documento

Meta revisa un encabezado multimedia con un archivo de muestra. Súbelo en tres pasos, desde la cuenta de negocio que tendrá la plantilla:

1. `POST /templates/media` con `channel_id`, `mime_type` y `size_bytes` responde una `upload_url` y una `upload_path`. Las imágenes son JPEG o PNG de hasta 5 MB, los videos MP4 o 3GPP de hasta 16 MB y los documentos PDF de hasta 100 MB.
2. Envía los bytes a `upload_url` con `PUT` y `Content-Type` igual a `mime_type`. La URL vale por dos horas.
3. `POST /templates/media/complete` con `channel_id` y `upload_path` envía el archivo a Meta y responde su `handle`.

```bash
curl https://getricky.ai/api/v1/templates/media/complete \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel_id": "8f3c2a5e-6b1d-4c7a-9e2f-1a2b3c4d5e6f",
    "upload_path": "…/template-samples/…/6f1e2d3c-4b5a-4968-8776-5a4b3c2d1e0f.jpg"
  }'
```

Envía el handle como encabezado: `"header": { "type": "IMAGE", "handle": "4::aW1h…" }`. Ricky borra su copia del archivo cuando la carga se completa, lo acepte Meta o no, así que una carga fallida empieza otra vez en el paso 1. Cada mensaje enviado con la plantilla lleva su propio archivo en su componente `header`.

## Sigue la revisión de Meta

`GET /templates/{template_id}` lee la plantilla de Meta. Su `status` es `PENDING` mientras Meta la revisa, y luego `APPROVED`, `REJECTED` o `PAUSED`. Solo una plantilla `APPROVED` se puede enviar. Consulta [Enviar mensajes](./sending-messages.md).

`GET /templates` lista las plantillas de todas tus cuentas de negocio.

## Edita y elimina

`PATCH /templates/{template_id}` cambia solo lo que envías: `category`, `header`, `body`, `footer` o `buttons` (reemplaza todos los botones). El nombre, el idioma y `parameter_format` no cambian. Ricky envía la plantilla editada a revisión otra vez.

Meta solo permite editar plantillas `APPROVED`, `REJECTED` o `PAUSED`, y limita cuántas veces cambia una aprobada. Si no lo permite, la respuesta es `422 rule_violation`. Al editar una plantilla con encabezado de imagen, video o documento, envía `header` otra vez con un `handle` de muestra nuevo, porque Meta no devuelve el anterior. Las plantillas con botones que el editor de Ricky no arma, como los de copiar código, no se editan por la API.

`DELETE /templates/{template_id}` elimina la plantilla en Meta. Meta la borra en todos los idiomas con ese nombre, y el nombre no se puede usar otra vez por 30 días.

## Llena variables con campos del contacto

Las variables de una plantilla pueden tomar el valor de un campo del contacto cuando Ricky se la envía a un contacto, como en las campañas. `GET /templates/{template_id}/field-mappings` responde las `variables` de la plantilla y sus `mappings`.

`PUT /templates/{template_id}/field-mappings` reemplaza todas las asignaciones. Cada una nombra una variable (`component` y `key`, como las lista `variables`) y un `source`: un campo que tiene todo contacto, `{ "kind": "native", "field": "first_name" }`, o un campo personalizado, `{ "kind": "custom", "field_id": "…" }` de `GET /contact-fields`. Una variable que la plantilla no tiene, o un campo de otra organización, recibe `400 invalid_input`. Envía `"mappings": []` para quitarlas todas.

Las asignaciones pertenecen al nombre y al idioma de la plantilla en su cuenta de negocio, así que se mantienen al editarla.

## Números de WhatsApp

`GET /whatsapp-numbers` lista los números de la organización, también los desconectados. `GET /whatsapp-numbers/{channel_id}` lee uno.

Cada número trae lo mismo que muestra la configuración de WhatsApp en Ricky:

| Campo              | Qué es                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `status`           | Estado del número en Meta, por ejemplo `CONNECTED`.                                                                               |
| `messaging_health` | Si Meta deja enviar: `available`, `limited` o `blocked`.                                                                          |
| `quality_rating`   | Calidad en Meta: `green`, `yellow`, `red`, `not_yet_determined` o `unknown`.                                                      |
| `messaging_limit`  | Límite de mensajes en Meta, por ejemplo `TIER_1K` o `TIER_UNLIMITED`; `UNKNOWN` hasta que Meta lo informe.                        |
| `last_synced_at`   | Cuándo Ricky leyó estos datos de Meta por última vez.                                                                             |
| `name_status`      | Estado de revisión del nombre visible en Meta, en minúsculas, por ejemplo `approved`.                                             |
| `business_profile` | Lo que los clientes ven en el perfil: `about`, `description`, `address`, `email`, `vertical`, `websites` y `profile_picture_url`. |

## Gestiona un número

Estas escrituras necesitan `conversations:write`. Cada una cambia el número en Meta y luego lo responde tal como Ricky lo vuelve a leer:

* `PATCH /whatsapp-numbers/{channel_id}` con `calls_enabled` activa o desactiva las llamadas al número.
* `PATCH /whatsapp-numbers/{channel_id}/business-profile` cambia solo los campos del perfil que envías. `about` admite hasta 139 caracteres, `description` 512, `address` 256, `email` 128 y `websites` hasta dos URL. `vertical` admite los valores que lista Meta, como `RETAIL`.
* `POST /whatsapp-numbers/{channel_id}/profile-photo` inicia una foto JPEG o PNG de hasta 5 MB; envía los bytes a `upload_url` con `PUT` y luego llama a `POST /whatsapp-numbers/{channel_id}/profile-photo/complete` con `upload_path`.
* `POST /whatsapp-numbers/{channel_id}/display-name` con `display_name` pide a Meta revisar un nombre nuevo y responde `202`. El nombre cambia solo si Meta lo aprueba; entonces cambian `verified_name` y `name_status`.
* `POST /whatsapp-numbers/{channel_id}/refresh` lee ahora los datos del número en Meta.

Si Meta rechaza un valor, la respuesta es `422 rule_violation` con el motivo de Meta. Un número desconectado también recibe `422 rule_violation`.
