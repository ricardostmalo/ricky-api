# Cambios

URL: https://getricky.ai/docs/api/changelog

> Versiones y cambios de la API de Ricky.

Esta página registra los cambios de la API. Un cambio incompatible solo llega en una versión nueva de la ruta y se anuncia aquí.

## 19 de octubre de 2026

**Inbox.** Cambios compatibles con la v1.

* **Filtros del inbox.** `GET /conversations` acepta `channel_id`, `tag_id`, `unread`, `pending_handoff`, `last_message_from`, `agent_id` y `unassigned`. Cada conversación trae `unread` y `active_handoff`. Consulta [Inbox](./inbox.md).
* **Asignar en lote.** `POST /conversations/assignments` asigna hasta 100 conversaciones y responde un resultado por conversación.
* **Traspasos.** `POST /conversations/{conversation_id}/handoff/resolve` devuelve la conversación al agente de IA o la deja con el miembro.
* **No leída.** `DELETE /conversations/{conversation_id}/read` marca una conversación como no leída.
* **Citar un mensaje.** `POST /conversations/{conversation_id}/messages` acepta `reply_to_message_id` en texto y archivos de WhatsApp.
* **Archivos recibidos.** `POST /conversations/{conversation_id}/messages/{message_id}/media` guarda en ese momento el archivo de un mensaje recibido y responde con su `url`.

**Campañas.** Cambios compatibles con la v1.

* **Campañas.** `GET /broadcasts`, `POST /broadcasts` y `GET /broadcasts/{broadcast_id}` listan, crean y consultan campañas de WhatsApp con cuántos destinatarios hay en cada estado de entrega. Una campaña se envía ahora o en `scheduled_at`, hasta 7 días después, a un filtro de contactos, a contactos elegidos o a números. Consulta [Campañas](./broadcasts.md).
* **Cancelar y seguir.** `POST /broadcasts/{broadcast_id}/cancel` cancela una campaña programada antes de que empiece. `GET /broadcasts/{broadcast_id}/recipients` lista cada número y el estado de su mensaje.
* **Permisos nuevos.** `broadcasts:read` y `broadcasts:write`.

**Workflows.** Cambios compatibles con la v1.

* **Gestionar workflows.** `GET /workflows`, `POST /workflows`, `GET`, `PATCH` y `DELETE /workflows/{workflow_id}`, `POST /workflows/{workflow_id}/activate` y `POST /workflows/{workflow_id}/pause`. Ricky revisa cada definición con las reglas del editor de workflows. Consulta [Workflows](./workflows.md).
* **Ejecuciones.** `GET /workflows/{workflow_id}/executions` lista las ejecuciones de un workflow con su estado, intentos y errores.
* **Permisos nuevos.** `workflows:read` y `workflows:write`.

**Reportes.** Cambios compatibles con la v1.

* **Operaciones de reportes.** `GET /reports/dashboard`, `/reports/conversations`, `/reports/messages`, `/reports/responses`, `/reports/resolutions`, `/reports/team`, `/reports/broadcasts` y `/reports/ads` responden los números de cada pestaña de Reportes, con sus filtros y sus definiciones, para un período de días de America/Panama. Consulta [Reportes](./reports.md).
* **Permiso nuevo.** `reports:read`.

**Agentes de IA y conocimiento.** Cambios compatibles con la v1.

* **Agentes.** `GET /agents`, `POST /agents`, `GET`, `PATCH` y `DELETE /agents/{agent_id}` listan, crean, consultan, actualizan y archivan agentes de IA. `GET /agent-options` lista los modelos, las voces y las capacidades que aceptan. Exigen `agents:read` o `agents:write`.
* **Agente de una conversación.** `PATCH /conversations/{conversation_id}/agent` pone un agente a responder una conversación o, con `null`, apaga la IA. Exige `conversations:write`.
* **Conocimiento.** `/knowledge/locations` y `/knowledge/contacts` crean, consultan, actualizan y eliminan ubicaciones y contactos del directorio. `/knowledge/files` sube archivos en tres pasos, los consulta, los actualiza y los elimina. Exigen `knowledge:read` o `knowledge:write`. Consulta [Agentes y conocimiento](./agents-and-knowledge.md).

**Etiquetas, campos de contacto, búsqueda, lectura y respuestas rápidas.** Cambios compatibles con la v1.

* **Etiquetas.** `PATCH` y `DELETE /tags/{tag_id}` renombran, cambian de color y borran una etiqueta en todos los contactos. Exigen el permiso nuevo `tags:write`, que `POST /tags` ahora también acepta además de `contacts:write`.
* **Etiquetas en muchos contactos.** `POST /contacts/tags` agrega y quita las mismas etiquetas en hasta 100 contactos. `PATCH /conversations/{conversation_id}/tags` cambia las etiquetas del contacto de una conversación.
* **Campos de contacto.** `POST /contact-fields` y `DELETE /contact-fields/{field_id}` crean y borran campos personalizados.
* **Búsqueda.** `GET /conversations/search` y `GET /messages/search` buscan por texto. Los contactos se buscan con `GET /contacts?query=`.
* **Lectura.** `POST /conversations/{conversation_id}/read` marca una conversación como leída, como al abrirla en el inbox.
* **Respuestas rápidas.** `GET` y `POST /quick-replies`, `GET`, `PATCH` y `DELETE /quick-replies/{quick_reply_id}`, con los permisos nuevos `quick_replies:read` y `quick_replies:write`. Consulta [Etiquetas, campos, búsqueda y respuestas rápidas](./crm-and-inbox.md).

**Plantillas y números de WhatsApp.** Cambios compatibles con la v1.

* **Gestionar plantillas.** `POST /templates` envía una plantilla a revisión de Meta; `GET`, `PATCH` y `DELETE /templates/{template_id}` la leen con su estado de revisión, la editan y la eliminan. `POST /templates/validate` revisa un borrador con las reglas del editor de plantillas sin enviarlo. Consulta [Plantillas y números de WhatsApp](./whatsapp.md).
* **Números de WhatsApp.** `GET /whatsapp-numbers` y `GET /whatsapp-numbers/{channel_id}` devuelven el estado, la calidad y el límite de mensajes de cada número. Exigen `conversations:read`.
* **Componentes en el formato de Meta.** Las plantillas traen `components` con las claves de Meta, por ejemplo `example.body_text`. Antes, las claves internas llegaban en camelCase.
* **Permiso nuevo.** `templates:write`.

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
