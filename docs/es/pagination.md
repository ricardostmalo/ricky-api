# Paginación

URL: https://getricky.ai/docs/api/pagination

> Recorre listas con page_size, cursor y next_cursor.

Toda lista responde con la misma forma:

```json
{
  "data": [],
  "next_cursor": "eyJ0IjoiMjAyNi0xMC0xNFQxNTo0MjoxMC41MTJaIn0"
}
```

`next_cursor` es `null` en la última página.

## Parámetros

| Parámetro   | Descripción                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------- |
| `page_size` | Elementos por página, de 1 a 100. Por defecto, 50.                                                 |
| `cursor`    | El `next_cursor` de la página anterior, sin cambios. Es opaco: no lo construyas ni lo interpretes. |

En conversaciones y mensajes, un cursor que Ricky no emitió recibe `400 invalid_input` con `param: "cursor"`. Mantén los mismos filtros en todas las páginas de un recorrido.

## Recorrer una lista

1. Pide la primera página sin `cursor`.
2. Si `next_cursor` no es `null`, pide la siguiente página con `cursor=<next_cursor>`.
3. Termina cuando `next_cursor` sea `null`.

Una página puede traer menos elementos que `page_size`. Decide el final solo por `next_cursor`.

```bash
curl "https://getricky.ai/api/v1/conversations?status=open&page_size=100" \
  -H "Authorization: Bearer $RICKY_API_KEY"

curl "https://getricky.ai/api/v1/conversations?status=open&page_size=100&cursor=eyJ0IjoiMjAyNi0xMC0xNFQxNTo0MjoxMC41MTJaIn0" \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

## Listas paginadas

| Operación                                       | Parámetros                                                           | Orden                          |
| ----------------------------------------------- | -------------------------------------------------------------------- | ------------------------------ |
| `GET /contacts`                                 | `page_size`, `cursor`, `query`, `tag_id`, `owner_user_id`, `channel` | Nombre, de la A a la Z         |
| `GET /conversations`                            | `page_size`, `cursor`, `status`, `assigned_user_id`                  | Actividad más reciente primero |
| `GET /conversations/{conversation_id}/messages` | `cursor`                                                             | Mensaje más reciente primero   |

La lista de mensajes no acepta `page_size`: Ricky decide el tamaño de cada página.

## Listas completas

Estas listas devuelven todo en una respuesta. Su `next_cursor` siempre es `null`.

| Operación                               | Contenido                                                       |
| --------------------------------------- | --------------------------------------------------------------- |
| `GET /channels`                         | Todos los canales conectados.                                   |
| `GET /contact-fields`                   | Todos los campos personalizados de contacto.                    |
| `GET /members`                          | Todos los miembros de la organización.                          |
| `GET /tags`                             | Todas las etiquetas de contacto.                                |
| `GET /templates`                        | Todas las plantillas de WhatsApp, leídas de Meta en el momento. |
| `GET /webhooks`                         | Los 100 webhooks más recientes.                                 |
| `GET /webhooks/{webhook_id}/deliveries` | Las 100 entregas más recientes de un webhook.                   |
