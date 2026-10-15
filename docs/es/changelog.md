# Cambios

URL: https://getricky.ai/docs/api/changelog

> Versiones y cambios de la API de Ricky.

Esta página registra los cambios de la API. Un cambio incompatible solo llega en una versión nueva de la ruta y se anuncia aquí.

## 15 de octubre de 2026

**Webhooks inmediatos, eventos nuevos, archivos, mensajes sueltos, etiquetas y notas.** Cambios compatibles con la v1.

* **Webhooks inmediatos.** Ricky envía cada evento en cuanto ocurre, en segundos, y cada reintento a su hora. Antes los enviaba en pasadas cada 15 minutos.
* **Eventos nuevos.** `message.delivered`, `message.read`, `message.failed`, `contact.created` y `contact.updated`. Los eventos de contacto traen `contact_id` en `data`. Un webhook admite hasta 10 tipos de evento.
* **Importaciones de historial.** Los mensajes que trae una importación de historial ya no generan eventos `message.*`.
* **`Idempotency-Key` opcional.** Las escrituras ya no exigen la cabecera. Sin ella, la solicitud se ejecuta; con ella, un reintento no repite el efecto. Un valor fuera de rango recibe `400 invalid_input`; el código `missing_idempotency_key` ya no existe.
* **Herramientas de webhooks.** `POST /webhooks/{webhook_id}/test` envía un evento `webhook.test` y devuelve lo que contestó tu endpoint. `POST /webhooks/{webhook_id}/rotate-secret` cambia el secreto de firma; durante el plazo que elijas, cada entrega trae la firma nueva y la anterior.
* **Claves de organización.** Una clave sigue funcionando aunque quien la creó deje la organización. Solo la revocación y el vencimiento la terminan.
* **Enviar archivos.** `POST /conversations/{conversation_id}/messages` acepta `type: "media"` con la URL HTTPS pública de una imagen, un video, un audio o un documento. Ricky lo descarga y lo envía por WhatsApp o Instagram. Consulta [Enviar mensajes](./sending-messages.md#6-envía-un-archivo).
* **Leer un mensaje.** `GET /conversations/{conversation_id}/messages/{message_id}` devuelve un mensaje igual que la lista, con un `media.url` firmado de nuevo.
* **Crear etiquetas.** `POST /tags` crea una etiqueta de contacto. Exige `contacts:write`. Un nombre en uso recibe `409 conflict`.
* **Agregar notas.** `POST /contacts/{contact_id}/notes` agrega texto al final de las notas de un contacto y devuelve el contacto. Exige `contacts:write`.

## 14 de octubre de 2026

**Primera versión pública de la referencia de la API v1.**

* **Contrato publicado.** El documento OpenAPI 3.1 está en [`https://getricky.ai/openapi.json`](https://getricky.ai/openapi.json). Ricky lo genera desde el mismo contrato que valida cada solicitud. La referencia de esta documentación sale de ese documento.
* **Convenciones.** Solicitudes y respuestas usan JSON con campos en snake\_case. Un cuerpo con un campo desconocido recibe `400 invalid_input`.
* **Listas.** Toda lista responde `{ "data": [...], "next_cursor": ... }`. Consulta [Paginación](./pagination.md).
* **Errores.** Todo error responde `{ "error": { "code", "message", "param", "request_id" } }`, con un catálogo de códigos estable. Consulta [Errores](./errors.md).
* **Iniciar conversaciones.** `POST /conversations` envía una plantilla de WhatsApp a un teléfono y crea el contacto y la conversación si no existen.
* **Plantillas en conversaciones.** `POST /conversations/{conversation_id}/messages` acepta `type: "template"`.
* **Seguimiento de envíos.** Los envíos responden `202` con un envío. `GET /sends/{send_id}` informa si el proveedor lo aceptó y, cuando lo aceptó, el `message_id` del mensaje.
* **Filtros de contactos.** `GET /contacts` filtra por `query`, `tag_id`, `owner_user_id`, `lifecycle_stage` y `channel`.
* **Catálogos.** `GET /channels` lista los canales conectados. `GET /contact-fields` lista los campos personalizados que usan las claves de `custom_values`.
* **Webhooks.** El campo `data` de cada evento trae `conversation_id` y, en los eventos `message.*`, `message_id`.
