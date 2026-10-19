# Idempotencia, límites y reintentos

URL: https://getricky.ai/docs/api/idempotency-and-rate-limits

> Repite escrituras sin duplicar efectos y respeta el límite de solicitudes.

## Idempotency-Key

La cabecera `Idempotency-Key` es opcional. Sirve para reintentar sin miedo: si una solicitud se corta y tu sistema la repite con la misma clave, Ricky no repite el efecto. Un mensaje no sale dos veces y un contacto no se crea dos veces. Sin la cabecera, la solicitud se ejecuta normalmente.

Recomendamos enviarla en todo envío de mensajes. Estas operaciones la aceptan:

| Operación | Endpoint | Permiso |
| --- | --- | --- |
| [Crear un contacto](https://getricky.ai/docs/api/reference/contacts/create-contact) | `POST /contacts` | `contacts:write` |
| [Actualizar un contacto](https://getricky.ai/docs/api/reference/contacts/update-contact) | `PATCH /contacts/{contact_id}` | `contacts:write` |
| [Agregar una nota a un contacto](https://getricky.ai/docs/api/reference/contacts/add-contact-note) | `POST /contacts/{contact_id}/notes` | `contacts:write` |
| [Iniciar una conversación](https://getricky.ai/docs/api/reference/conversations/start-conversation) | `POST /conversations` | `messages:send` |
| [Asignar una conversación](https://getricky.ai/docs/api/reference/conversations/assign-conversation) | `PATCH /conversations/{conversation_id}/assignment` | `conversations:write` |
| [Cerrar una conversación](https://getricky.ai/docs/api/reference/conversations/close-conversation) | `POST /conversations/{conversation_id}/close` | `conversations:write` |
| [Reabrir una conversación](https://getricky.ai/docs/api/reference/conversations/reopen-conversation) | `POST /conversations/{conversation_id}/reopen` | `conversations:write` |
| [Enviar un mensaje](https://getricky.ai/docs/api/reference/messages/send-message) | `POST /conversations/{conversation_id}/messages` | `messages:send` |
| [Crear una etiqueta](https://getricky.ai/docs/api/reference/catalogs/create-tag) | `POST /tags` | `tags:write` o, en claves anteriores, `contacts:write` |
| [Crear un workflow](https://getricky.ai/docs/api/reference/workflows/create-workflow) | `POST /workflows` | `workflows:write` |
| [Actualizar un workflow](https://getricky.ai/docs/api/reference/workflows/update-workflow) | `PATCH /workflows/{workflow_id}` | `workflows:write` |
| [Crear un agente](https://getricky.ai/docs/api/reference/agents/create-agent) | `POST /agents` | `agents:write` |
| [Actualizar un agente](https://getricky.ai/docs/api/reference/agents/update-agent) | `PATCH /agents/{agent_id}` | `agents:write` |
| [Definir el agente de IA de una conversación](https://getricky.ai/docs/api/reference/conversations/assign-conversation-agent) | `PATCH /conversations/{conversation_id}/agent` | `conversations:write` |
| [Crear una ubicación](https://getricky.ai/docs/api/reference/knowledge/create-knowledge-location) | `POST /knowledge/locations` | `knowledge:write` |
| [Actualizar una ubicación](https://getricky.ai/docs/api/reference/knowledge/update-knowledge-location) | `PATCH /knowledge/locations/{location_id}` | `knowledge:write` |
| [Crear un contacto del directorio](https://getricky.ai/docs/api/reference/knowledge/create-knowledge-contact) | `POST /knowledge/contacts` | `knowledge:write` |
| [Actualizar un contacto del directorio](https://getricky.ai/docs/api/reference/knowledge/update-knowledge-contact) | `PATCH /knowledge/contacts/{knowledge_contact_id}` | `knowledge:write` |
| [Subir un archivo](https://getricky.ai/docs/api/reference/knowledge/create-knowledge-file) | `POST /knowledge/files` | `knowledge:write` |
| [Completar una carga](https://getricky.ai/docs/api/reference/knowledge/complete-knowledge-file) | `POST /knowledge/files/{file_id}/complete` | `knowledge:write` |
| [Actualizar un archivo](https://getricky.ai/docs/api/reference/knowledge/update-knowledge-file) | `PATCH /knowledge/files/{file_id}` | `knowledge:write` |
| [Cambiar etiquetas de muchos contactos](https://getricky.ai/docs/api/reference/contacts/change-contacts-tags) | `POST /contacts/tags` | `contacts:write` |
| [Crear un campo de contacto](https://getricky.ai/docs/api/reference/contacts/create-contact-field) | `POST /contact-fields` | `contacts:write` |
| [Eliminar un campo de contacto](https://getricky.ai/docs/api/reference/contacts/delete-contact-field) | `DELETE /contact-fields/{field_id}` | `contacts:write` |
| [Actualizar una etiqueta](https://getricky.ai/docs/api/reference/catalogs/update-tag) | `PATCH /tags/{tag_id}` | `tags:write` |
| [Eliminar una etiqueta](https://getricky.ai/docs/api/reference/catalogs/delete-tag) | `DELETE /tags/{tag_id}` | `tags:write` |
| [Cambiar las etiquetas de una conversación](https://getricky.ai/docs/api/reference/conversations/change-conversation-tags) | `PATCH /conversations/{conversation_id}/tags` | `contacts:write` |
| [Marcar una conversación como leída](https://getricky.ai/docs/api/reference/conversations/mark-conversation-read) | `POST /conversations/{conversation_id}/read` | `conversations:write` |
| [Crear una respuesta rápida](https://getricky.ai/docs/api/reference/quick-replies/create-quick-reply) | `POST /quick-replies` | `quick_replies:write` |
| [Actualizar una respuesta rápida](https://getricky.ai/docs/api/reference/quick-replies/update-quick-reply) | `PATCH /quick-replies/{quick_reply_id}` | `quick_replies:write` |
| [Eliminar una respuesta rápida](https://getricky.ai/docs/api/reference/quick-replies/delete-quick-reply) | `DELETE /quick-replies/{quick_reply_id}` | `quick_replies:write` |

Crear o desactivar un webhook y reintentar una entrega no usan esta cabecera.

### Reglas

* El valor lo eliges tú: un UUID v4 o, mejor, un identificador de tu sistema para esa acción, como `pedido-10482-listo`. Así un reintento de tu sistema reutiliza la misma clave. Debe tener entre 8 y 200 caracteres. No uses datos personales, como un correo o un teléfono.
* La clave de idempotencia vale para tu clave de API. Otra clave de API puede usar el mismo valor sin conflicto.
* Ricky compara el método, la ruta y el cuerpo. Repite los tres exactamente iguales al reintentar.
* Un valor fuera de rango recibe `400 invalid_input` con `param: "Idempotency-Key"`.

```bash
curl https://getricky.ai/api/v1/contacts \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed" \
  -d '{"first_name": "Ana", "last_name": "Pérez", "primary_phone": "+507 6000-1234"}'
```

### Qué responde Ricky al repetir una clave

| Primer intento                    | Repetición con la misma clave y la misma solicitud                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Terminó con `2xx`                 | La misma respuesta y el mismo estado, con la cabecera `Idempotency-Replayed: true`. No hay efecto nuevo. |
| Sigue en proceso                  | `409 request_processing` con `Retry-After: 5`.                                                           |
| Terminó con `4xx`                 | Ricky libera la clave. La repetición se procesa como una solicitud nueva.                                |
| Terminó con `5xx` o sin respuesta | `409 request_processing`. El efecto puede haber ocurrido o no.                                           |

La misma clave con otro método, otra ruta u otro cuerpo recibe `409 idempotency_conflict`.

### Estado desconocido

Después de un `5xx`, Ricky no sabe si el efecto ocurrió, así que la misma clave sigue respondiendo `409 request_processing`. Haz esto:

1. Lee el recurso para saber si la escritura ocurrió. Por ejemplo, después de enviar un mensaje, lista los mensajes de la conversación.
2. Si ocurrió, no hagas nada más.
3. Si no ocurrió, repite la escritura con una `Idempotency-Key` nueva.

Una clave nueva siempre crea un efecto nuevo. Úsala solo cuando sepas que el primer intento no ocurrió. Si no puedes saberlo, escribe a soporte con el `X-Request-Id`.

## Límite de solicitudes

Cada clave de API admite 120 solicitudes por minuto. La ventana es el minuto del reloj: se reinicia en el segundo 0 de cada minuto.

Toda respuesta a una clave válida, exitosa o con error, incluye:

| Cabecera                | Valor                                                  |
| ----------------------- | ------------------------------------------------------ |
| `X-RateLimit-Limit`     | Solicitudes por minuto: `120`.                         |
| `X-RateLimit-Remaining` | Solicitudes que quedan en el minuto actual.            |
| `X-RateLimit-Reset`     | Hora Unix, en segundos, en que se reinicia la ventana. |

Al superar el límite, la respuesta es `429 rate_limited` con `Retry-After`, en segundos, y las mismas cabeceras `X-RateLimit-*`. Espera ese tiempo antes de enviar otra solicitud con esa clave.

Si tienes que procesar muchos registros, reparte las solicitudes en el tiempo y lee `X-RateLimit-Remaining` antes de cada lote.

## Reintentos

Reintenta solo lo que puede tener éxito sin cambios. Espera más entre cada intento: retroceso exponencial con una variación aleatoria, por ejemplo 1, 2, 4, 8 y 16 segundos, hasta un máximo de 5 intentos. Si la respuesta trae `Retry-After`, espera al menos ese tiempo.

| Respuesta                               | Lectura (`GET`)               | Escritura con `Idempotency-Key`                                                                                |
| --------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Error de red o tiempo de espera agotado | Reintenta.                    | Reintenta con la misma clave.                                                                                  |
| `429 rate_limited`                      | Reintenta tras `Retry-After`. | Reintenta con la misma clave tras `Retry-After`.                                                               |
| `409 request_processing`                | No aplica.                    | Reintenta con la misma clave tras `Retry-After`. Si persiste, sigue [Estado desconocido](#estado-desconocido). |
| `500`, `502` o `503`                    | Reintenta.                    | Sigue [Estado desconocido](#estado-desconocido).                                                               |
| Otro `4xx`                              | Corrige la solicitud.         | Corrige la solicitud.                                                                                          |
