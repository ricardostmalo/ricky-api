# Agentes y conocimiento

URL: https://getricky.ai/docs/api/agents-and-knowledge

> Crea agentes de IA, ponlos en conversaciones y mantén al día la información que comparten.

Un agente responde a los clientes con sus instrucciones y sus capacidades. El conocimiento es lo que comparten los agentes de la organización: ubicaciones, tarjetas de contacto del directorio y archivos.

Los agentes exigen `agents:read` y `agents:write`. Poner un agente en una conversación exige `conversations:write`. El conocimiento exige `knowledge:read` y `knowledge:write`.

## 1. Consulta las opciones

`GET /agent-options` lista las voces y las capacidades que Ricky acepta. Usa solo esos valores: cualquier otro recibe `400 invalid_input`.

```bash
curl https://getricky.ai/api/v1/agent-options \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

Una capacidad cuya `family` no es `human_handoff` funciona solo cuando la organización conecta esa integración en Ricky. `ricky.handoff.request` necesita `handoff_user_ids`: los miembros que reciben la conversación.

## 2. Crea un agente

```bash
curl https://getricky.ai/api/v1/agents \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: agente-ventas-v1" \
  -d '{
    "name": "Asistente de ventas",
    "instructions": "Saluda por el nombre y confirma el pedido antes de dar la fecha de entrega.",
    "capabilities": ["ricky.handoff.request"],
    "handoff_user_ids": ["2d4f6a8c-1b3d-4e5f-8a7b-9c0d1e2f3a4b"]
  }'
```

Sin `voice`, el agente recibe la predeterminada de `GET /agent-options`. `PATCH /agents/{agent_id}` cambia solo los campos que envías; `capabilities` y `handoff_user_ids` reemplazan sus conjuntos completos. `DELETE /agents/{agent_id}` lo archiva: deja de responder sus conversaciones y se pausan los flujos que lo asignan.

## 3. Ponlo en una conversación

```bash
curl -X PATCH https://getricky.ai/api/v1/conversations/$CONVERSATION_ID/agent \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "agent_id": "7e8f9a0b-1c2d-4e3f-a4b5-c6d7e8f9a0b1" }'
```

La respuesta es la conversación con su `agent_id`. La conversación deja de estar asignada a un miembro. `"agent_id": null` apaga la IA en esa conversación.

## 4. Ubicaciones y contactos del directorio

`/knowledge/locations` guarda las sucursales que los agentes envían como ubicación de WhatsApp: nombre, dirección, coordenadas confirmadas, teléfono, correo y horario. `/knowledge/contacts` guarda las tarjetas de contacto que envían; cada una necesita un nombre visible y un teléfono o un correo. Ambas aceptan `GET`, `POST`, `PATCH` y `DELETE`, y Ricky guarda los teléfonos en E.164.

## 5. Sube un archivo

Un archivo se sube en tres pasos, así sus bytes nunca pasan por el cuerpo JSON.

```bash
curl https://getricky.ai/api/v1/knowledge/files \
  -H "Authorization: Bearer $RICKY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Lista de precios 2026",
    "filename": "precios.pdf",
    "mime_type": "application/pdf",
    "size_bytes": 482133
  }'
```

La respuesta trae el archivo, `uploading`, y una `upload_url` válida por dos horas. Envía ahí los bytes con el mismo tipo y tamaño que declaraste:

```bash
curl -X PUT "$UPLOAD_URL" -H "Content-Type: application/pdf" --data-binary @precios.pdf
```

Luego complétalo. Ricky revisa los bytes, lee el contenido para los agentes y responde el archivo, `ready`; un PDF largo puede tardar minutos.

```bash
curl -X POST https://getricky.ai/api/v1/knowledge/files/$FILE_ID/complete \
  -H "Authorization: Bearer $RICKY_API_KEY"
```

Los PDF, Word y Excel admiten hasta 100 MB; las imágenes JPEG y PNG, hasta 5 MB. Si Ricky no lee contenido útil, `extraction_error` lo dice y los agentes no pueden consultarlo, aunque sí enviarlo. `GET /knowledge/files/{file_id}` de un archivo `ready` trae una `download_url` válida por cinco minutos.
