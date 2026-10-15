# Introducción

URL: https://getricky.ai/docs/api

> Conecta tus sistemas con los contactos, las conversaciones y los mensajes de tu organización.

La API de Ricky es una API REST sobre HTTPS. Cada clave pertenece a una organización y solo ve sus datos. Con ella puedes leer y actualizar contactos, iniciar conversaciones de WhatsApp con plantillas, enviar mensajes y recibir eventos por webhook.

## URL base

```text
https://getricky.ai/api/v1
```

Las rutas de esta documentación son relativas a esa URL.

## Convenciones

| Tema                | Regla                                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Formato             | JSON en UTF-8. Una solicitud con cuerpo envía `Content-Type: application/json` y pesa como máximo 64 KiB.                                                          |
| Nombres             | Campos y parámetros en snake\_case: `primary_phone`, `next_cursor`.                                                                                                |
| IDs                 | UUID. Los IDs de plantilla son los de Meta y se tratan como texto.                                                                                                 |
| Fechas              | ISO 8601 en UTC, por ejemplo `2026-10-14T15:30:00.000Z`. Las fechas sin hora, como `birthday`, usan `YYYY-MM-DD`.                                                  |
| Teléfonos           | `primary_phone` y el `address` de un canal de WhatsApp van en E.164, por ejemplo `+50760001234`. El `external_id` de WhatsApp es el mismo número solo con dígitos. |
| Respuestas          | Un recurso llega en `data`. Una lista llega en `data`, junto con `next_cursor`.                                                                                    |
| Errores             | Toda respuesta que no es 2xx tiene la forma `{ "error": { … } }`. Consulta [Errores](./errors.md).                                                            |
| Campos desconocidos | Un cuerpo con un campo que no existe recibe `400 invalid_input`. Las respuestas pueden ganar campos nuevos: tu código debe ignorar los que no conoce.              |

## Versionado

La versión forma parte de la ruta: `/v1`. Dentro de `v1`, Ricky puede publicar en cualquier momento cambios compatibles: endpoints nuevos, campos opcionales nuevos en las solicitudes, campos nuevos en las respuestas, y valores nuevos en enumeraciones, códigos de error y tipos de evento. Tu integración debe tolerar esos valores sin fallar.

Un cambio incompatible solo llega en una versión nueva de la ruta. Ricky lo anuncia en [Cambios](./changelog.md).

## Recursos

| Recurso        | Contenido                                                                    | Referencia                                                            |
| -------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Contactos      | Personas del CRM y sus campos personalizados.                                | [Contacts](https://getricky.ai/docs/api/reference/contacts/list-contacts)                |
| Conversaciones | Hilos con un contacto en un canal: iniciar, leer, asignar, cerrar y reabrir. | [Conversations](https://getricky.ai/docs/api/reference/conversations/list-conversations) |
| Mensajes       | Leer y enviar mensajes, y seguir cada envío.                                 | [Messages](https://getricky.ai/docs/api/reference/messages/list-messages)                |
| Catálogos      | Canales, miembros, etiquetas y plantillas que otras operaciones usan por ID. | [Catalogs](https://getricky.ai/docs/api/reference/catalogs/list-channels)                |
| Webhooks       | Suscripciones a eventos y el registro de sus entregas.                       | [Webhooks](https://getricky.ai/docs/api/reference/webhooks/list-webhooks)                |

La referencia sale del contrato de la API. El documento OpenAPI 3.1 completo está en [`https://getricky.ai/openapi.json`](https://getricky.ai/openapi.json). Puedes usarlo para generar un cliente o importarlo en tu herramienta de pruebas.

## Primera solicitud

1. Crea una clave en **Configuración → API** con el permiso `contacts:read`. Consulta [Autenticación](./authentication.md).
2. Guarda la clave en una variable de entorno de tu servidor.
3. Lista los contactos:

```bash
curl "https://getricky.ai/api/v1/contacts?page_size=1" \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

```json title="200 OK"
{
  "data": [
    {
      "id": "c1f0a8e2-5b3d-4c7a-9e21-7d6b4a3f2e10",
      "first_name": "Ana",
      "last_name": "Pérez",
      "primary_email": "ana.perez@example.com",
      "primary_phone": "+50760001234",
      "company": null,
      "job_title": null,
      "birthday": "1990-03-21",
      "city": "Panamá",
      "region": null,
      "country": "Panamá",
      "street_address": null,
      "postal_code": null,
      "website_url": null,
      "linkedin_url": null,
      "source": "Tienda Costa del Este",
      "notes": null,
      "owner_user_id": "2d4f6a8c-0e1b-4c3d-9e5f-7a9b1c3d5e7f",
      "lead_status": null,
      "lifecycle_stage": "customer",
      "custom_values": {
        "6b5a4c3d-2e1f-4a0b-9c8d-7e6f5a4b3c2d": "Costa del Este"
      },
      "identities": [
        {
          "id": "9a2b7c4d-1e3f-4a5b-8c6d-0e1f2a3b4c5d",
          "channel_type": "whatsapp",
          "external_id": "50760001234",
          "display_name": "Ana Pérez",
          "username": null
        }
      ],
      "tags": [
        {
          "id": "4e7d2c1b-8a9f-4b3e-a1c2-d3e4f5a6b7c8",
          "name": "Cliente frecuente",
          "color": "teal"
        }
      ],
      "last_activity_at": "2026-10-14T15:42:10.512Z",
      "last_activity_preview": "Gracias, ahí estaré.",
      "last_conversation_id": "3f6d2a10-8b7c-4e1d-9a2f-5c4b3e2d1a09",
      "updated_at": "2026-10-14T15:42:10.512Z"
    }
  ],
  "next_cursor": "eyJ0IjoiMjAyNi0xMC0xNFQxNTo0MjoxMC41MTJaIn0"
}
```

`next_cursor` lleva a la página siguiente. Consulta [Paginación](./pagination.md).

## SDKs

Los SDK oficiales se publican como `getricky` en npm y PyPI. Se generan del documento OpenAPI, así que cubren todas las operaciones, y además agregan un `Idempotency-Key` a las escrituras, reintentan los límites de velocidad y los errores del servidor, recorren las páginas y verifican los webhooks. Su código y sus README están en [`ricardostmalo/ricky-api`](https://github.com/ricardostmalo/ricky-api/tree/main/sdks).

```bash
npm install getricky   # Node.js 18 o posterior
pip install getricky   # Python 3.9 o posterior
```

```ts title="TypeScript"
import { Ricky } from 'getricky';

const ricky = new Ricky(process.env.RICKY_API_KEY);

const { data: channels } = await ricky.listChannels();
const { data: send } = await ricky.startConversation({
  body: { channel_id: channels[0].id, phone: '+50760001234', template: { id: '1234567890' } },
});
for await (const contact of ricky.paginate(ricky.listContacts)) console.log(contact.first_name);
```

```python title="Python"
import os
from getricky import Ricky

ricky = Ricky(os.environ["RICKY_API_KEY"])

channels = ricky.list_channels()["data"]
send = ricky.start_conversation(
    {"channel_id": channels[0]["id"], "phone": "+50760001234", "template": {"id": "1234567890"}}
)["data"]
for contact in ricky.paginate(ricky.list_contacts):
    print(contact["first_name"])
```

## Siguientes pasos

- [Autenticación](./authentication.md): Claves, permisos y vencimiento.
- [Enviar mensajes](./sending-messages.md): Plantillas, respuestas y seguimiento de cada envío.
- [Webhooks](./webhooks.md): Eventos firmados con HMAC y reintentos.
- [Errores](./errors.md): Forma del error y catálogo de códigos.
