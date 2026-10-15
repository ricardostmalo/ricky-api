# Errores

URL: https://getricky.ai/docs/api/errors

> Forma de las respuestas de error y catálogo de códigos.

Toda respuesta con un estado distinto de 2xx tiene el mismo cuerpo:

```json title="400 Bad Request"
{
  "error": {
    "code": "invalid_input",
    "message": "primary_email: Invalid email address",
    "param": "primary_email",
    "request_id": "7c1e9a3b-5d2f-4e8a-b6c0-1f3d5a7b9e2c"
  }
}
```

| Campo        | Descripción                                                                                                                                               |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code`       | Código estable, legible por máquina. Basa tu lógica en él.                                                                                                |
| `message`    | Explicación para personas. Puede cambiar: no la analices en tu código.                                                                                    |
| `param`      | El campo o parámetro que causó el error, cuando se conoce: `phone`, `template.components.0.parameters.0.text`, `cursor`, `Idempotency-Key`. Puede faltar. |
| `request_id` | Identificador de la solicitud. También llega en la cabecera `X-Request-Id`.                                                                               |

Toda respuesta, exitosa o no, incluye `X-Request-Id`. Guárdalo en tus registros e inclúyelo cuando escribas a soporte.

## Códigos

La tabla sale del contrato de la API. Cada página de la referencia lista los códigos que esa operación puede responder.

| Código | HTTP | Significado |
| --- | --- | --- |
| `invalid_input` | 400 | Un parámetro o un campo del cuerpo no es válido; `param` lo nombra cuando se conoce. |
| `invalid_json` | 400 | El cuerpo no es JSON válido. |
| `unauthorized` | 401 | Falta la cabecera `Authorization`, está mal formada, o la clave venció o fue revocada. |
| `insufficient_scope` | 403 | La clave no tiene el permiso que exige la operación. |
| `forbidden` | 403 | La organización no permite la operación. |
| `not_found` | 404 | El recurso no existe en esta organización. |
| `conflict` | 409 | El recurso cambió de una forma que impide la operación. |
| `idempotency_conflict` | 409 | La `Idempotency-Key` ya se usó para otra solicitud. |
| `request_processing` | 409 | Una solicitud con esta `Idempotency-Key` sigue en proceso o terminó en un estado desconocido. |
| `body_too_large` | 413 | El cuerpo JSON supera 64 KiB. |
| `unsupported_media_type` | 415 | El cuerpo debe ser `application/json`. |
| `outside_messaging_window` | 422 | El canal solo admite texto libre dentro de su ventana de respuesta; envía una plantilla. |
| `rule_violation` | 422 | La solicitud incumple una regla de negocio; `message` dice cuál. |
| `rate_limited` | 429 | Más de 120 solicitudes en este minuto con esta clave; consulta `Retry-After`. |
| `internal_error` | 500 | Ricky falló. Reintenta una lectura. Antes de reintentar una escritura, consulta el recurso: la misma `Idempotency-Key` responde `request_processing`. |
| `upstream_error` | 502 | El proveedor de mensajería falló. Reintenta más tarde. |
| `unavailable` | 503 | Una dependencia no está disponible por ahora. Reintenta más tarde. |

## Cómo tratarlos

* Decide por `code`. Si recibes un código que no conoces, decide por el estado HTTP.
* Un `4xx` indica un problema de la solicitud. No la repitas sin cambiarla, salvo `409 request_processing` y `429 rate_limited`.
* Un `5xx` indica un fallo de Ricky o del proveedor. Antes de repetir una escritura, lee [Idempotencia, límites y reintentos](./idempotency-and-rate-limits.md).
* La validación se detiene en el primer problema. Si corriges un campo, otro puede fallar después.
