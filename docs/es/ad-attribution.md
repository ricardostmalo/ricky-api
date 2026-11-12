# Atribución de anuncios

URL: https://getricky.ai/docs/api/ad-attribution

> De qué anuncio de Meta vino cada conversación, mensaje y contacto, las conversaciones de un anuncio y qué pasó después.

Cuando alguien escribe desde un anuncio de clic a WhatsApp, Instagram o Messenger, Meta envía el ID del anuncio con su mensaje. Ricky lo guarda, y la API lo responde en el mensaje, en la conversación y en el contacto, filtra las listas por él y lista las conversaciones que trajo cada anuncio.

| Tarea                                               | Operación                                                            | Permiso              |
| --------------------------------------------------- | -------------------------------------------------------------------- | -------------------- |
| El anuncio del que vino una conversación            | `GET /conversations/{id}`: `first_ad_referral`, `latest_ad_referral` | `conversations:read` |
| El anuncio del que vino un mensaje                  | `GET /conversations/{id}/messages`: `ad_referral`                    | `conversations:read` |
| El primer y el último contacto de una persona       | `GET /contacts/{id}`: `first_ad_referral`, `last_ad_referral`        | `contacts:read`      |
| Conversaciones o contactos de un anuncio            | `GET /conversations?ad_id=…`, `GET /contacts?ad_id=…`                | el de cada lista     |
| Todas las conversaciones que trajeron los anuncios  | `GET /ads/conversations`                                             | `conversations:read` |
| Inversión, clics y resultados de Meta por anuncio   | `GET /ads/insights?level=ad`                                         | `reports:read`       |
| Saber al momento que alguien escribió de un anuncio | Webhook `message.received` con `data.ad_id`                          | `webhooks:manage`    |

## Cuándo un mensaje viene de un anuncio

Un mensaje viene de un anuncio cuando es un mensaje del cliente cuya referencia de Meta nombra un anuncio: `referral.source_id` con `source_type: "ad"` en WhatsApp, o `referral.ad_id` con `source: "ADS"` en Instagram y Messenger. Es la misma definición de `GET /reports/ads` y de la página de Anuncios. Una referencia de una publicación orgánica (`source_type: "post"`) no es un anuncio.

Una conversación guarda su primer y su último anuncio: alguien que escribió desde un anuncio en marzo y volvió desde otro en octubre tiene los dos. Un contacto los guarda entre todas sus conversaciones y canales: `first_ad_referral` es el primer contacto y `last_ad_referral` el último. Cualquier otro mensaje, conversación o contacto responde `null`.

## La referencia

```json
{
  "ad_id": "120210000000000001",
  "channel": "whatsapp",
  "message_id": "c41d7e2a-5b6f-4a89-8c3d-0e1f2a3b4c5d",
  "conversation_id": "9b2e4c61-7a3f-4d18-b5c2-6e0f1a2b3c4d",
  "contact_id": "3f6c2b1e-8d4a-4b7e-9a51-2c7d8e9f0a1b",
  "referred_at": "2026-10-14T15:30:00.000Z",
  "source_type": "ad",
  "source_url": "https://fb.me/2ZBx1WlQe",
  "headline": "Implantes dentales en un día",
  "body": "Agenda tu evaluación sin costo.",
  "media_type": "video",
  "image_url": "https://…/ad-referral-images/…/thumbnail.jpg",
  "video_url": "https://…",
  "ctwa_clid": "ARAkLkA8rmlFeiCktEJQ…",
  "ref": null,
  "resolved": {
    "ad_name": "Implantes - video octubre",
    "campaign_id": "120210000000000003",
    "campaign_name": "Implantes dentales",
    "ad_set_id": "120210000000000002",
    "ad_set_name": "Panamá 30-55",
    "ad_account_id": "1234567890",
    "synced_at": "2026-10-14T06:00:00.000Z"
  }
}
```

Todos los campos menos `resolved` son lo que Meta envió en el mensaje, o el registro de Ricky de ese mensaje: qué mensaje, conversación, contacto y canal, y cuándo escribió el cliente. WhatsApp envía más (`source_url`, `body`, `media_type`, `ctwa_clid`); Instagram y Messenger envían el ID del anuncio, su título y su contenido, y `ref` cuando el enlace del anuncio lo trae. Un campo que Meta no envió es `null`. `image_url` es la copia permanente que Ricky guarda de la imagen que envió Meta, o el enlace de Meta mientras no haya vencido.

`resolved` no viene en el mensaje. Es el anuncio tal como Ricky lo sincronizó por última vez de la cuenta publicitaria de Meta conectada a la organización: su nombre, campaña y conjunto. Es `null` cuando Meta Ads no está conectado, o cuando el anuncio es de una cuenta publicitaria que Ricky no sincroniza. `GET /ads/ads` lee el mismo anuncio en vivo de Meta.

`ad_id` es el mismo ID que el `ad_id` de `GET /ads/insights?level=ad` y el `id` de `GET /ads/ads`, así que puedes cruzar conversaciones con inversión.

## Filtra las listas por anuncio

`GET /conversations` y `GET /contacts` aceptan estos filtros, solos o juntos, y con los demás filtros de la lista:

| Parámetro         | Deja las conversaciones o contactos con un mensaje del cliente |
| ----------------- | -------------------------------------------------------------- |
| `ad_id`           | de ese anuncio                                                 |
| `campaign_id`     | de un anuncio de esa campaña                                   |
| `ad_set_id`       | de un anuncio de ese conjunto                                  |
| `referred_after`  | de un anuncio, enviado en ese momento o después (ISO 8601)     |
| `referred_before` | de un anuncio, enviado antes de ese momento                    |

Se aplican juntos a un mismo mensaje: `ad_id=…&referred_after=2026-10-01T00:00:00-05:00` deja las conversaciones a las que ese anuncio trajo a alguien desde el 1 de octubre, no las que tuvieron ese anuncio alguna vez y cualquier anuncio desde entonces. `campaign_id` y `ad_set_id` buscan entre los anuncios que Ricky sincronizó de una cuenta publicitaria conectada; sin la conexión no dejan nada.

`GET /conversations` también acepta `last_activity_after` y `last_activity_before`, por la hora del último mensaje.

## Las conversaciones que trajeron los anuncios

`GET /ads/conversations` responde cada conversación que un anuncio abrió o trajo de vuelta en un período, de la más reciente a la más antigua, con el contacto, el estado de la conversación y las respuestas que recibió:

```bash
curl "https://getricky.ai/api/v1/ads/conversations?from=2026-10-01&to=2026-10-31&campaign_id=120210000000000003" \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

```json
{
  "data": [
    {
      "ad_referral": { "ad_id": "120210000000000001", "headline": "Implantes dentales en un día", "resolved": { "campaign_name": "Implantes dentales" } },
      "opened_conversation": true,
      "message_text": "Hola, quiero más información sobre los implantes.",
      "contact": { "id": "3f6c2b1e-…", "name": "Ana Pérez", "phone": "+50760001234", "external_id": "50760001234" },
      "conversation": { "id": "9b2e4c61-…", "status": "closed", "close_category": "sale", "closed_at": "2026-10-15T18:00:00.000Z", "created_at": "2026-10-14T15:30:00.000Z" },
      "customer_messages": 9,
      "replies": 7,
      "first_reply_seconds": 42
    }
  ],
  "next_cursor": null
}
```

El ejemplo está recortado; `ad_referral` trae todos los campos de arriba.

* `from` y `to` son días de America/Panama, ambos incluidos, como en los [reportes](./reports.md#el-período): los dos o ninguno (los últimos 7 días), como máximo 366 días. Filtra por cuándo escribió el cliente desde el anuncio.
* Una fila por conversación y anuncio: el primer mensaje de ese anuncio en esa conversación dentro del período. Una conversación que trajeron dos anuncios tiene dos filas, así que por anuncio estas filas suman las conversaciones de `GET /reports/ads`.
* `opened_conversation` es `true` cuando ese mensaje empezó la conversación, `false` cuando el anuncio trajo de vuelta a alguien que ya había escrito.
* `customer_messages` y `replies` cuentan desde ese mensaje hasta ahora. Una respuesta la escribe un miembro, un agente de IA o alguien en la app del propio canal; las automatizaciones, los envíos masivos, las plantillas y las reacciones no son respuestas. `first_reply_seconds` es la espera hasta la primera, `null` mientras no tenga respuesta.
* Acepta `ad_id`, `campaign_id`, `ad_set_id` y `channel`, y pagina con `page_size` (hasta 100) y `cursor`.

Lee los mensajes que recibió Ricky, así que funciona sin conectar Meta Ads; solo `resolved` necesita la conexión.

## Ventas y citas

Ricky registra una venta solo cuando un miembro cierra la conversación como venta: `close_category: "sale"` en la conversación. No registra monto, producto ni pago, y no sabe de ventas hechas fuera del chat. Para reportar ingresos por anuncio, cruza el `phone` o el `external_id` del contacto con tu sistema de ventas o de citas, y agrupa por `ad_id` o por `resolved.campaign_id`.

## Receta: un reporte de anuncios

1. `GET /ads/conversations?from=…&to=…` y sigue `next_cursor`: quién vino de qué anuncio, si era nuevo, qué escribió primero, qué tan rápido le respondieron y cómo terminó la conversación.
2. Para lo que preguntó después del primer mensaje, `GET /conversations/{conversation_id}/messages` de las filas que necesites.
3. `GET /ads/insights?level=ad&from=…&to=…` para la inversión, las impresiones y los clics por `ad_id`. Los días de Meta son los de la zona horaria de la cuenta publicitaria; los de Ricky, America/Panama.
4. Cruza por `ad_id`: costo por conversación, conversaciones por campaña, ventas por campaña donde `close_category` es `sale`.

Para enterarte en el momento, suscribe un [webhook](./webhooks.md) a `message.received`: cuando el mensaje vino de un anuncio, `data.ad_id` lo nombra.

## Una clave para una agencia

Solo un dueño o administrador de la organización crea claves. Para una agencia que arma reportes, crea una en **Configuración → API** con **Solo ver** en todos los recursos y una fecha de vencimiento: puede leer conversaciones, contactos, reportes y Meta Ads, y no puede enviar, editar ni borrar nada. La clave es de la organización: revócala en **Configuración → API** cuando la agencia deje de trabajar contigo. Consulta [Autenticación](./authentication.md).

Una clave hace 120 solicitudes por minuto. `GET /ads/conversations` responde hasta 100 conversaciones por solicitud, así que léelo primero y pide los mensajes solo de las conversaciones que necesites.
