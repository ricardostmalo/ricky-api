# Autenticación

URL: https://getricky.ai/docs/api/authentication

> Crea claves con permisos mínimos y envíalas desde tu servidor.

Cada solicitud lleva una clave de API de la organización en la cabecera `Authorization`. La clave define qué organización ves y qué operaciones puedes llamar.

## Crea una clave

Solo los propietarios y administradores de la organización pueden crear y revocar claves.

1. Abre **Configuración → API** en Ricky.
2. Escribe un nombre que identifique la integración, por ejemplo `ERP de tiendas`.
3. Marca solo los permisos que la integración necesita.
4. Elige el vencimiento: 90 días o 1 año.
5. Selecciona **Crear clave** y copia la clave.

Ricky muestra la clave completa una sola vez y guarda solo su huella SHA-256. Si la pierdes, crea otra.

Una clave tiene la forma `rky_live_` seguida de 43 caracteres.

## Envía la clave

```bash
curl https://getricky.ai/api/v1/members \
  -H "Authorization: Bearer rky_live_…"
```

Usa la clave solo en tu servidor. No la incluyas en una página web, una app móvil, una URL ni un registro. Guárdala en un gestor de secretos o en una variable de entorno.

## Vigencia

La clave pertenece a la organización, no a una persona. Sigue funcionando aunque quien la creó deje la organización o cambie de rol; lo que la clave hace queda registrado a nombre de esa persona. Deja de funcionar solo en estos casos:

* Alguien la revoca en **Configuración → API**. El efecto es inmediato.
* Llega su fecha de vencimiento.

Cuando sale de tu equipo alguien que conocía la clave, rótala.

Una clave que no funciona recibe `401 unauthorized`.

Para rotar una clave, crea la nueva, despliégala en tu servidor y revoca la anterior.

## Permisos

Cada operación exige un permiso (scope). Una clave sin ese permiso recibe `403 insufficient_scope`. `POST /tags` también acepta `contacts:write`, el permiso que exigía antes de que existiera `tags:write`.

| Permiso               | Permite                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `contacts:read`       | Leer contactos y campos de contacto.                                                                        |
| `contacts:write`      | Crear y actualizar contactos, agregarles notas, cambiar sus etiquetas, y crear y borrar campos de contacto. |
| `conversations:read`  | Leer y buscar conversaciones, mensajes y canales.                                                           |
| `conversations:write` | Asignar, cerrar, reabrir y marcar como leídas las conversaciones, y definir su agente de IA.                |
| `messages:send`       | Iniciar conversaciones, enviar mensajes y consultar envíos.                                                 |
| `templates:read`      | Leer las plantillas de WhatsApp.                                                                            |
| `members:read`        | Leer los miembros de la organización.                                                                       |
| `tags:read`           | Leer las etiquetas de contactos.                                                                            |
| `webhooks:manage`     | Crear, listar y desactivar webhooks; consultar y reintentar sus entregas.                                   |
| `workflows:read`      | Leer workflows y sus ejecuciones.                                                                           |
| `workflows:write`     | Crear, editar, activar, pausar y eliminar workflows.                                                        |
| `reports:read`        | Leer los números de las páginas de Reportes.                                                                |
| `agents:read`         | Leer agentes y sus opciones de configuración.                                                               |
| `agents:write`        | Crear, actualizar y archivar agentes.                                                                       |
| `knowledge:read`      | Leer ubicaciones, contactos del directorio y archivos de conocimiento.                                      |
| `knowledge:write`     | Crear, actualizar y eliminar ubicaciones, contactos del directorio y archivos de conocimiento.              |
| `tags:write`          | Crear, editar y borrar etiquetas.                                                                           |
| `quick_replies:read`  | Leer respuestas rápidas.                                                                                    |
| `quick_replies:write` | Crear, actualizar y borrar respuestas rápidas.                                                              |

La tabla siguiente sale del contrato de la API: es la lista exacta de operaciones y el permiso de cada una.

| Operación | Endpoint | Permiso |
| --- | --- | --- |
| [Listar contactos](https://getricky.ai/docs/api/reference/contacts/list-contacts) | `GET /contacts` | `contacts:read` |
| [Crear un contacto](https://getricky.ai/docs/api/reference/contacts/create-contact) | `POST /contacts` | `contacts:write` |
| [Consultar un contacto](https://getricky.ai/docs/api/reference/contacts/get-contact) | `GET /contacts/{contact_id}` | `contacts:read` |
| [Actualizar un contacto](https://getricky.ai/docs/api/reference/contacts/update-contact) | `PATCH /contacts/{contact_id}` | `contacts:write` |
| [Agregar una nota a un contacto](https://getricky.ai/docs/api/reference/contacts/add-contact-note) | `POST /contacts/{contact_id}/notes` | `contacts:write` |
| [Listar campos de contacto](https://getricky.ai/docs/api/reference/contacts/list-contact-fields) | `GET /contact-fields` | `contacts:read` |
| [Listar conversaciones](https://getricky.ai/docs/api/reference/conversations/list-conversations) | `GET /conversations` | `conversations:read` |
| [Iniciar una conversación](https://getricky.ai/docs/api/reference/conversations/start-conversation) | `POST /conversations` | `messages:send` |
| [Consultar una conversación](https://getricky.ai/docs/api/reference/conversations/get-conversation) | `GET /conversations/{conversation_id}` | `conversations:read` |
| [Asignar una conversación](https://getricky.ai/docs/api/reference/conversations/assign-conversation) | `PATCH /conversations/{conversation_id}/assignment` | `conversations:write` |
| [Cerrar una conversación](https://getricky.ai/docs/api/reference/conversations/close-conversation) | `POST /conversations/{conversation_id}/close` | `conversations:write` |
| [Reabrir una conversación](https://getricky.ai/docs/api/reference/conversations/reopen-conversation) | `POST /conversations/{conversation_id}/reopen` | `conversations:write` |
| [Listar mensajes](https://getricky.ai/docs/api/reference/messages/list-messages) | `GET /conversations/{conversation_id}/messages` | `conversations:read` |
| [Consultar un mensaje](https://getricky.ai/docs/api/reference/messages/get-message) | `GET /conversations/{conversation_id}/messages/{message_id}` | `conversations:read` |
| [Enviar un mensaje](https://getricky.ai/docs/api/reference/messages/send-message) | `POST /conversations/{conversation_id}/messages` | `messages:send` |
| [Consultar un envío](https://getricky.ai/docs/api/reference/messages/get-send) | `GET /sends/{send_id}` | `messages:send` |
| [Listar canales](https://getricky.ai/docs/api/reference/catalogs/list-channels) | `GET /channels` | `conversations:read` |
| [Listar miembros](https://getricky.ai/docs/api/reference/catalogs/list-members) | `GET /members` | `members:read` |
| [Listar etiquetas](https://getricky.ai/docs/api/reference/catalogs/list-tags) | `GET /tags` | `tags:read` |
| [Crear una etiqueta](https://getricky.ai/docs/api/reference/catalogs/create-tag) | `POST /tags` | `tags:write` o, en claves anteriores, `contacts:write` |
| [Listar plantillas](https://getricky.ai/docs/api/reference/catalogs/list-templates) | `GET /templates` | `templates:read` |
| [Listar webhooks](https://getricky.ai/docs/api/reference/webhooks/list-webhooks) | `GET /webhooks` | `webhooks:manage` |
| [Crear un webhook](https://getricky.ai/docs/api/reference/webhooks/create-webhook) | `POST /webhooks` | `webhooks:manage` |
| [Desactivar un webhook](https://getricky.ai/docs/api/reference/webhooks/disable-webhook) | `DELETE /webhooks/{webhook_id}` | `webhooks:manage` |
| [Enviar un evento de prueba](https://getricky.ai/docs/api/reference/webhooks/test-webhook) | `POST /webhooks/{webhook_id}/test` | `webhooks:manage` |
| [Rotar el secreto de firma](https://getricky.ai/docs/api/reference/webhooks/rotate-webhook-secret) | `POST /webhooks/{webhook_id}/rotate-secret` | `webhooks:manage` |
| [Listar entregas](https://getricky.ai/docs/api/reference/webhooks/list-webhook-deliveries) | `GET /webhooks/{webhook_id}/deliveries` | `webhooks:manage` |
| [Reintentar una entrega](https://getricky.ai/docs/api/reference/webhooks/retry-webhook-delivery) | `POST /webhooks/{webhook_id}/deliveries/{delivery_id}/retry` | `webhooks:manage` |
| [Listar workflows](https://getricky.ai/docs/api/reference/workflows/list-workflows) | `GET /workflows` | `workflows:read` |
| [Crear un workflow](https://getricky.ai/docs/api/reference/workflows/create-workflow) | `POST /workflows` | `workflows:write` |
| [Consultar un workflow](https://getricky.ai/docs/api/reference/workflows/get-workflow) | `GET /workflows/{workflow_id}` | `workflows:read` |
| [Actualizar un workflow](https://getricky.ai/docs/api/reference/workflows/update-workflow) | `PATCH /workflows/{workflow_id}` | `workflows:write` |
| [Eliminar un workflow](https://getricky.ai/docs/api/reference/workflows/delete-workflow) | `DELETE /workflows/{workflow_id}` | `workflows:write` |
| [Activar un workflow](https://getricky.ai/docs/api/reference/workflows/activate-workflow) | `POST /workflows/{workflow_id}/activate` | `workflows:write` |
| [Pausar un workflow](https://getricky.ai/docs/api/reference/workflows/pause-workflow) | `POST /workflows/{workflow_id}/pause` | `workflows:write` |
| [Listar ejecuciones](https://getricky.ai/docs/api/reference/workflows/list-workflow-executions) | `GET /workflows/{workflow_id}/executions` | `workflows:read` |
| [Consultar el panel en vivo](https://getricky.ai/docs/api/reference/reports/get-dashboard-report) | `GET /reports/dashboard` | `reports:read` |
| [Consultar el reporte de conversaciones](https://getricky.ai/docs/api/reference/reports/get-conversations-report) | `GET /reports/conversations` | `reports:read` |
| [Consultar el reporte de mensajes](https://getricky.ai/docs/api/reference/reports/get-messages-report) | `GET /reports/messages` | `reports:read` |
| [Consultar el reporte de respuestas](https://getricky.ai/docs/api/reference/reports/get-responses-report) | `GET /reports/responses` | `reports:read` |
| [Consultar el reporte de resoluciones](https://getricky.ai/docs/api/reference/reports/get-resolutions-report) | `GET /reports/resolutions` | `reports:read` |
| [Consultar el reporte del equipo](https://getricky.ai/docs/api/reference/reports/get-team-report) | `GET /reports/team` | `reports:read` |
| [Consultar el reporte de envíos masivos](https://getricky.ai/docs/api/reference/reports/get-broadcasts-report) | `GET /reports/broadcasts` | `reports:read` |
| [Consultar el reporte de anuncios](https://getricky.ai/docs/api/reference/reports/get-ads-report) | `GET /reports/ads` | `reports:read` |
| [Listar agentes](https://getricky.ai/docs/api/reference/agents/list-agents) | `GET /agents` | `agents:read` |
| [Crear un agente](https://getricky.ai/docs/api/reference/agents/create-agent) | `POST /agents` | `agents:write` |
| [Consultar un agente](https://getricky.ai/docs/api/reference/agents/get-agent) | `GET /agents/{agent_id}` | `agents:read` |
| [Actualizar un agente](https://getricky.ai/docs/api/reference/agents/update-agent) | `PATCH /agents/{agent_id}` | `agents:write` |
| [Archivar un agente](https://getricky.ai/docs/api/reference/agents/archive-agent) | `DELETE /agents/{agent_id}` | `agents:write` |
| [Consultar las opciones de agentes](https://getricky.ai/docs/api/reference/agents/get-agent-options) | `GET /agent-options` | `agents:read` |
| [Definir el agente de IA de una conversación](https://getricky.ai/docs/api/reference/conversations/assign-conversation-agent) | `PATCH /conversations/{conversation_id}/agent` | `conversations:write` |
| [Listar ubicaciones](https://getricky.ai/docs/api/reference/knowledge/list-knowledge-locations) | `GET /knowledge/locations` | `knowledge:read` |
| [Crear una ubicación](https://getricky.ai/docs/api/reference/knowledge/create-knowledge-location) | `POST /knowledge/locations` | `knowledge:write` |
| [Consultar una ubicación](https://getricky.ai/docs/api/reference/knowledge/get-knowledge-location) | `GET /knowledge/locations/{location_id}` | `knowledge:read` |
| [Actualizar una ubicación](https://getricky.ai/docs/api/reference/knowledge/update-knowledge-location) | `PATCH /knowledge/locations/{location_id}` | `knowledge:write` |
| [Eliminar una ubicación](https://getricky.ai/docs/api/reference/knowledge/delete-knowledge-location) | `DELETE /knowledge/locations/{location_id}` | `knowledge:write` |
| [Listar contactos del directorio](https://getricky.ai/docs/api/reference/knowledge/list-knowledge-contacts) | `GET /knowledge/contacts` | `knowledge:read` |
| [Crear un contacto del directorio](https://getricky.ai/docs/api/reference/knowledge/create-knowledge-contact) | `POST /knowledge/contacts` | `knowledge:write` |
| [Consultar un contacto del directorio](https://getricky.ai/docs/api/reference/knowledge/get-knowledge-contact) | `GET /knowledge/contacts/{knowledge_contact_id}` | `knowledge:read` |
| [Actualizar un contacto del directorio](https://getricky.ai/docs/api/reference/knowledge/update-knowledge-contact) | `PATCH /knowledge/contacts/{knowledge_contact_id}` | `knowledge:write` |
| [Eliminar un contacto del directorio](https://getricky.ai/docs/api/reference/knowledge/delete-knowledge-contact) | `DELETE /knowledge/contacts/{knowledge_contact_id}` | `knowledge:write` |
| [Listar archivos](https://getricky.ai/docs/api/reference/knowledge/list-knowledge-files) | `GET /knowledge/files` | `knowledge:read` |
| [Subir un archivo](https://getricky.ai/docs/api/reference/knowledge/create-knowledge-file) | `POST /knowledge/files` | `knowledge:write` |
| [Completar una carga](https://getricky.ai/docs/api/reference/knowledge/complete-knowledge-file) | `POST /knowledge/files/{file_id}/complete` | `knowledge:write` |
| [Consultar un archivo](https://getricky.ai/docs/api/reference/knowledge/get-knowledge-file) | `GET /knowledge/files/{file_id}` | `knowledge:read` |
| [Actualizar un archivo](https://getricky.ai/docs/api/reference/knowledge/update-knowledge-file) | `PATCH /knowledge/files/{file_id}` | `knowledge:write` |
| [Eliminar un archivo](https://getricky.ai/docs/api/reference/knowledge/delete-knowledge-file) | `DELETE /knowledge/files/{file_id}` | `knowledge:write` |
| [Cambiar etiquetas de muchos contactos](https://getricky.ai/docs/api/reference/contacts/change-contacts-tags) | `POST /contacts/tags` | `contacts:write` |
| [Crear un campo de contacto](https://getricky.ai/docs/api/reference/contacts/create-contact-field) | `POST /contact-fields` | `contacts:write` |
| [Eliminar un campo de contacto](https://getricky.ai/docs/api/reference/contacts/delete-contact-field) | `DELETE /contact-fields/{field_id}` | `contacts:write` |
| [Actualizar una etiqueta](https://getricky.ai/docs/api/reference/catalogs/update-tag) | `PATCH /tags/{tag_id}` | `tags:write` |
| [Eliminar una etiqueta](https://getricky.ai/docs/api/reference/catalogs/delete-tag) | `DELETE /tags/{tag_id}` | `tags:write` |
| [Buscar conversaciones](https://getricky.ai/docs/api/reference/conversations/search-conversations) | `GET /conversations/search` | `conversations:read` |
| [Cambiar las etiquetas de una conversación](https://getricky.ai/docs/api/reference/conversations/change-conversation-tags) | `PATCH /conversations/{conversation_id}/tags` | `contacts:write` |
| [Marcar una conversación como leída](https://getricky.ai/docs/api/reference/conversations/mark-conversation-read) | `POST /conversations/{conversation_id}/read` | `conversations:write` |
| [Buscar mensajes](https://getricky.ai/docs/api/reference/messages/search-messages) | `GET /messages/search` | `conversations:read` |
| [Listar respuestas rápidas](https://getricky.ai/docs/api/reference/quick-replies/list-quick-replies) | `GET /quick-replies` | `quick_replies:read` |
| [Crear una respuesta rápida](https://getricky.ai/docs/api/reference/quick-replies/create-quick-reply) | `POST /quick-replies` | `quick_replies:write` |
| [Consultar una respuesta rápida](https://getricky.ai/docs/api/reference/quick-replies/get-quick-reply) | `GET /quick-replies/{quick_reply_id}` | `quick_replies:read` |
| [Actualizar una respuesta rápida](https://getricky.ai/docs/api/reference/quick-replies/update-quick-reply) | `PATCH /quick-replies/{quick_reply_id}` | `quick_replies:write` |
| [Eliminar una respuesta rápida](https://getricky.ai/docs/api/reference/quick-replies/delete-quick-reply) | `DELETE /quick-replies/{quick_reply_id}` | `quick_replies:write` |

## Respuestas de autenticación

| Situación                                                             | Respuesta                |
| --------------------------------------------------------------------- | ------------------------ |
| Falta la cabecera, está mal formada, o la clave venció o fue revocada | `401 unauthorized`       |
| La clave no tiene el permiso de la operación                          | `403 insufficient_scope` |
| La clave superó 120 solicitudes en el minuto                          | `429 rate_limited`       |

El **Registro de solicitudes** de **Configuración → API** muestra las solicitudes de tus claves de los últimos 30 días, con su estado, código de error, duración e ID de solicitud. No guarda cuerpos ni cabeceras, y no incluye solicitudes sin una clave válida.

Consulta [Errores](./errors.md) y [Idempotencia, límites y reintentos](./idempotency-and-rate-limits.md).
