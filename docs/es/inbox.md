# Inbox

URL: https://getricky.ai/docs/api/inbox

> Filtra conversaciones como el inbox, asígnalas en lote, resuelve traspasos, márcalas como no leídas, cita mensajes y obtén archivos recibidos.

Estas operaciones hacen lo que hace el inbox de Ricky, con las mismas reglas.

| Tarea                                     | Operación                                              | Permiso               |
| ----------------------------------------- | ------------------------------------------------------ | --------------------- |
| Filtrar conversaciones                    | `GET /conversations?…`                                 | `conversations:read`  |
| Asignar hasta 100 conversaciones          | `POST /conversations/assignments`                      | `conversations:write` |
| Resolver un traspaso del agente de IA     | `POST /conversations/{id}/handoff/resolve`             | `conversations:write` |
| Marcar una conversación como no leída     | `DELETE /conversations/{id}/read`                      | `conversations:write` |
| Responder citando un mensaje              | `POST /conversations/{id}/messages`                    | `messages:send`       |
| Obtener el archivo de un mensaje recibido | `POST /conversations/{id}/messages/{message_id}/media` | `conversations:read`  |

## Filtros

`GET /conversations` acepta los filtros del inbox. Se combinan entre sí; envía los mismos junto con `cursor` en cada página.

| Parámetro                    | Solo conversaciones                                            |
| ---------------------------- | -------------------------------------------------------------- |
| `status`                     | `open` o `closed`                                              |
| `channel_id`                 | de ese canal, incluidas conexiones anteriores del mismo número |
| `tag_id`                     | cuyo contacto tiene esa etiqueta                               |
| `unread=true`                | con mensajes que el equipo no ha leído                         |
| `pending_handoff=true`       | con un traspaso a una persona sin resolver                     |
| `last_message_from=customer` | cuyo último mensaje vino del contacto                          |
| `assigned_user_id`           | asignadas a ese miembro                                        |
| `agent_id`                   | que responde ese agente de IA, sin miembro asignado            |
| `unassigned=true`            | sin miembro ni agente de IA                                    |

`assigned_user_id`, `agent_id` y `unassigned=true` se excluyen entre sí: enviar más de uno responde `400 invalid_input`. Un canal o una etiqueta que la organización no tiene responde una lista vacía.

Cada conversación trae `unread` y `active_handoff`, el traspaso pendiente o `null`.

## Asignar en lote

`POST /conversations/assignments` hace responsables a miembros de hasta 100 conversaciones, cada una una sola vez. Cada miembro pasa a ser también el responsable del contacto, como al asignar una por una.

```bash
curl -X POST https://getricky.ai/api/v1/conversations/assignments \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{"assignments": [{"conversation_id": "…", "assigned_user_id": "…"}]}'
```

La respuesta trae un resultado por conversación, en orden. `status` es `assigned`, `not_found` (la organización no tiene esa conversación) o `failed` (reintenta esa conversación). Un miembro que no es de la organización rechaza toda la solicitud con `400 invalid_input` antes de cambiar alguna conversación. Consulta `GET /members`.

## Traspasos

Cuando un agente de IA pide que una persona tome la conversación, `active_handoff` trae el motivo, el resumen y el miembro responsable. `POST /conversations/{id}/handoff/resolve` lo cierra:

* `{"resolution": "returned_to_ai"}` devuelve la conversación al agente que pidió el traspaso y quita al miembro.
* `{"resolution": "stayed_with_human"}` la deja con el miembro.

Una conversación sin traspaso pendiente responde `422 rule_violation`, y también `returned_to_ai` cuando ningún agente de IA lo pidió. La respuesta es la conversación con `active_handoff: null`.

## Marcar como no leída

`DELETE /conversations/{id}/read` la marca como no leída para todo el equipo. El contacto no ve nada. `POST` sobre la misma ruta la marca como leída.

## Citar un mensaje

En WhatsApp, un texto o un archivo puede citar un mensaje de la misma conversación con `reply_to_message_id`, el `id` de `GET /conversations/{id}/messages`:

```json
{ "type": "text", "text": "Sí, ya están listos.", "reply_to_message_id": "…" }
```

Un mensaje de otra conversación, uno que WhatsApp no envió o un canal distinto de WhatsApp responden `400 invalid_input` con `param: "reply_to_message_id"`.

## Archivos recibidos

Ricky guarda en segundo plano el archivo de cada mensaje que recibe; mientras tanto `media.url` es `null`. `POST /conversations/{id}/messages/{message_id}/media` lo guarda en ese momento desde el proveedor y responde con el mensaje y su `url`, firmada por una hora. Si ya estaba guardado, responde de inmediato.

El proveedor conserva los archivos por tiempo limitado (unos 30 días en WhatsApp). Un mensaje sin archivo recibido, o cuyo archivo el proveedor dice que expiró, responde `422 rule_violation`; otras fallas del proveedor responden `502 upstream_error`.
