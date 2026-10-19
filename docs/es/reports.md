# Reportes

URL: https://getricky.ai/docs/api/reports

> Lee los números de las páginas de Reportes para un período, con los mismos filtros.

Cada operación de reportes responde los números de una pestaña de **Reportes** en Ricky. La API lee los mismos datos con las mismas definiciones, así que para el mismo período y los mismos filtros muestra lo que muestra la página. La clave necesita el permiso `reports:read`.

| Operación                    | Pestaña        | Filtros                              | Qué responde                                                           |
| ---------------------------- | -------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| `GET /reports/dashboard`     | Ahora          | Ninguno: es el momento actual        | Conversaciones abiertas, quién las tiene y quién espera respuesta.     |
| `GET /reports/conversations` | Conversaciones | `from`, `to`, `channel`              | Clientes que escribieron, nuevos o recurrentes, por canal, día y hora. |
| `GET /reports/messages`      | Mensajes       | `from`, `to`, `channel`              | Mensajes recibidos y enviados, y quién los envió.                      |
| `GET /reports/responses`     | Respuestas     | `from`, `to`, `channel`, `responder` | Tiempos de respuesta y respuestas por conversación.                    |
| `GET /reports/resolutions`   | Resoluciones   | `from`, `to`, `channel`              | Cierres y cuánto tiempo estuvieron abiertas las conversaciones.        |
| `GET /reports/team`          | Equipo         | `from`, `to`, `channel`              | Asignaciones, mensajes, cierres y medianas por miembro y agente de IA. |
| `GET /reports/broadcasts`    | Envíos         | `from`, `to`                         | Envíos masivos de WhatsApp y lo que pasó con sus destinatarios.        |
| `GET /reports/ads`           | Anuncios       | `from`, `to`                         | Inversión en anuncios de Meta junto a las conversaciones que trajo.    |

## El período

* `from` y `to` son días, `YYYY-MM-DD`, los dos incluidos. Envía los dos o ninguno. Sin ellos, el reporte cubre los últimos 7 días, hoy incluido.
* Los días son de **America/Panama**, como en las páginas de Reportes. Un mensaje enviado a las 23:30 en Panamá cuenta en ese día.
* Un `to` posterior a hoy cuenta como hoy. `from` no puede ser posterior a hoy ni a `to`, y un período tiene como máximo 366 días. Si no, la respuesta es `400 invalid_input`.
* `period` en la respuesta repite los días que cubre el reporte y nombra el período anterior: la misma cantidad de días, justo antes. Cada número `previous` es de ese período.
* `series` tiene una entrada por día. En un período de un día tiene 24, una por hora, y `period.granularity` es `hour`.

Las duraciones van en segundos. Las horas como `generated_at` van en ISO 8601 y UTC.

## Leer un reporte

```bash
curl "https://getricky.ai/api/v1/reports/responses?from=2026-10-01&to=2026-10-14&channel=whatsapp" \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

```json
{
  "data": {
    "period": {
      "from": "2026-10-01",
      "to": "2026-10-14",
      "days": 14,
      "granularity": "day",
      "time_zone": "America/Panama",
      "previous_from": "2026-09-17",
      "previous_to": "2026-09-30"
    },
    "channel": "whatsapp",
    "responder": "all",
    "awaiting_reply_now": 3,
    "response_time": {
      "responses": 412,
      "average_seconds": 184.2,
      "median_seconds": 41,
      "p90_seconds": 520,
      "previous_average_seconds": 201.7,
      "buckets": [{ "bucket": "under_30s", "count": 170, "share": 0.41 }],
      "series": [
        {
          "slot": "2026-10-01",
          "average_seconds": 150.3,
          "median_seconds": 38,
          "previous_average_seconds": 210.1,
          "previous_median_seconds": 45
        }
      ]
    },
    "generated_at": "2026-10-14T15:30:00.000Z"
  }
}
```

El ejemplo está recortado. La [referencia](https://getricky.ai/docs/api/reference/reports/get-responses-report) lista cada campo y define qué cuenta cada uno.

## Definiciones

* **Cliente** (reporte de conversaciones): una conversación con al menos un mensaje del cliente en el período. Es nuevo cuando su primer mensaje de todos cae en el período.
* **Respuesta** (reporte de respuestas): el primer mensaje enviado al cliente, que no sea una reacción, justo después de un mensaje del cliente. Su tiempo es la espera desde ese mensaje. Los seguimientos, las automatizaciones y las plantillas no son respuestas. `responder=humans` abarca a las personas en Ricky y en la app del propio canal; `responder=agents`, a los agentes de IA; el ID de un miembro o agente de IA, solo a ese.
* **Resolución** (reporte de resoluciones): cada cierre del período, desde la apertura de ese tramo hasta el cierre.
* **Anuncios**: una conversación viene de un anuncio cuando un mensaje del cliente trae una referencia de anuncio de Meta. La inversión viene de Meta con los días de la propia cuenta publicitaria, así que los bordes de un período pueden diferir por la diferencia entre las zonas horarias.

Los reportes se calculan cuando los pides. Las páginas de Reportes guardan cada resultado unos minutos, así que una página abierta antes puede mostrar números un poco más viejos.
