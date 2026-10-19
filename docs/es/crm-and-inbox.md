# Etiquetas, campos, búsqueda y respuestas rápidas

URL: https://getricky.ai/docs/api/crm-and-inbox

> Organiza contactos con etiquetas y campos, busca en el inbox, marca conversaciones como leídas y administra respuestas rápidas.

Estas operaciones hacen lo que hacen en Ricky la página de Contactos, el inbox y la configuración de respuestas rápidas, con las mismas reglas.

| Tarea                                                    | Operación                                             | Permiso                                      |
| -------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------- |
| Crear, renombrar, cambiar de color o borrar una etiqueta | `POST /tags`, `PATCH` y `DELETE /tags/{id}`           | `tags:write`                                 |
| Agregar o quitar etiquetas en hasta 100 contactos        | `POST /contacts/tags`                                 | `contacts:write`                             |
| Agregar o quitar etiquetas de una conversación           | `PATCH /conversations/{id}/tags`                      | `contacts:write`                             |
| Crear o borrar un campo de contacto                      | `POST /contact-fields`, `DELETE /contact-fields/{id}` | `contacts:write`                             |
| Buscar contactos                                         | `GET /contacts?query=`                                | `contacts:read`                              |
| Buscar conversaciones                                    | `GET /conversations/search`                           | `conversations:read`                         |
| Buscar mensajes                                          | `GET /messages/search`                                | `conversations:read`                         |
| Marcar una conversación como leída                       | `POST /conversations/{id}/read`                       | `conversations:write`                        |
| Leer y administrar respuestas rápidas                    | `/quick-replies`                                      | `quick_replies:read` o `quick_replies:write` |

`POST /tags` también acepta `contacts:write`, el permiso que exigía antes de que existiera `tags:write`.

## Etiquetas

Una etiqueta es de la organización; los contactos la llevan. Renombrar o cambiar el color de una etiqueta la cambia en todos los contactos. Borrarla la quita de todos los contactos y no se puede deshacer. Un nombre ya usado, en mayúsculas o minúsculas, responde `409 conflict`.

Los cambios de etiquetas agregan y quitan IDs sobre las que el contacto ya tiene; las demás se quedan. Para reemplazar todas las etiquetas de un contacto, envía `tag_ids` a `PATCH /contacts/{id}`.

```bash
curl -X POST https://getricky.ai/api/v1/contacts/tags \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{"contact_ids": ["…", "…"], "add_tag_ids": ["…"], "remove_tag_ids": []}'
```

La respuesta trae un resultado por contacto, en orden. `status` es `updated`, `not_found` (la organización no tiene ese contacto) o `failed` (reintenta ese contacto). Un ID de etiqueta que la organización no tiene rechaza toda la solicitud con `400 invalid_input` antes de cambiar algún contacto.

En una conversación, las etiquetas son de su contacto: `PATCH /conversations/{id}/tags` cambia las etiquetas del contacto y responde con el contacto.

## Campos de contacto

`POST /contact-fields` agrega un campo personalizado a todos los contactos. `type` no puede cambiar después; `select` y `multi_select` necesitan `options`. Escribe los valores con `custom_values` en un contacto, con el ID del campo como clave. Borrar un campo borra su valor en todos los contactos y no se puede deshacer.

## Búsqueda

* Contactos: `GET /contacts?query=` busca en el nombre, el teléfono, el correo o la empresa, con los demás filtros de la lista y paginación.
* Conversaciones: `GET /conversations/search?query=` busca en el contacto, su nombre o usuario en el canal, o los mensajes de la conversación. Primero la actividad más reciente.
* Mensajes: `GET /messages/search?query=` busca palabras en el texto, o en lo que Ricky sacó de una nota de voz o un archivo. Primero los más recientes.

La búsqueda de conversaciones y de mensajes responde una página de hasta `limit` resultados; `next_cursor` siempre es `null`. Precisa el texto para encontrar resultados más viejos.

## Marcar como leída

`POST /conversations/{id}/read` marca la conversación como leída para todo el equipo hasta su último mensaje, como al abrirla en el inbox. En WhatsApp, el contacto ve la confirmación de lectura. No envíes cuerpo.

## Respuestas rápidas

Las respuestas rápidas son las respuestas guardadas que los operadores insertan en el inbox. `GET /quick-replies` las lista por título. Un título ya usado, en mayúsculas o minúsculas, responde `409 conflict`. `PATCH` cambia solo los campos que envías. `DELETE` no se puede deshacer.
