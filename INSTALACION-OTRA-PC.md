# roma-api — Instalación en otra PC (WhatsApp + fotos)

Versión del pipeline de imágenes: **v3** (descarga lookaside → `/inbound-media/`).

## Qué incluye este paquete

| Archivo / carpeta | Función |
|-------------------|---------|
| `src/lib/whatsapp-media-download.ts` | Descarga fotos de Meta |
| `src/app/api/webhook/route.ts` | Webhook + enrich de imágenes |
| `src/app/api/media/resolve-inbound/route.ts` | Respaldo si el CRM pide descarga |
| `src/app/api/health/route.ts` | Comprobar que el código nuevo está activo |
| `src/app/api/media/file/[filename]/route.ts` | **Sirve las fotos** (el CRM las descarga por aquí) |
| `public/inbound-media/` | Carpeta donde se guardan las fotos |
| `.env.local` | **Lo creas tú** (ver abajo) |

## Empaquetar en tu PC (antes de copiar)

Desde la carpeta `roma-api`:

```powershell
npm run empaquetar
```

Genera `roma-api-para-otra-pc.zip` en el escritorio (o ruta que indique el script).  
**Incluye** tu `.env.local` si existe.

O comprime manualmente la carpeta `roma-api` **sin** `node_modules` ni `.next`.

## En la otra PC

### 1. Requisitos

- Node.js 20+
- ngrok apuntando al **puerto 3000**

### 2. Descomprimir e instalar

```powershell
cd C:\ruta\roma-api
copy env.local.plantilla .env.local
# Edita .env.local: ROMA_API_PUBLIC_URL = tu ngrok del 3000
npm install
```

### 3. Variables obligatorias en `.env.local`

```env
ROMA_API_PUBLIC_URL=https://periastral-honeydewed-mellisa.ngrok-free.dev
LARAVEL_MESSAGES_URL=https://custody-rants-lazily.ngrok-free.dev/api/roma/messages
ROMA_SYNC_TOKEN=roma_sync_secret_2026
```

(+ Supabase: `NEXT_PUBLIC_SUPABASE_URL`, keys, etc.)

El token de Meta (`meta_access_token`) debe estar en **Supabase → `app_settings`** (panel admin de roma-api), no en `.env.local`.

### 4. Arrancar

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

En otra terminal:

```powershell
ngrok http 3000
```

La URL de ngrok debe coincidir con `ROMA_API_PUBLIC_URL`.

### 5. Comprobar que es la versión nueva

Abre en el navegador:

`https://TU-NGROK.ngrok-free.dev/api/health`

Respuesta esperada:

```json
{
  "ok": true,
  "media_pipeline_version": 3,
  "roma_api_public_url": "https://TU-NGROK.ngrok-free.dev"
}
```

Si sale **404** o sin `media_pipeline_version: 3`, el zip es viejo o falta `src/app/api/health/`.

### 6. Webhook en Meta

URL del webhook:

`https://TU-NGROK.ngrok-free.dev/api/webhook`

Verify token: el de `WHATSAPP_VERIFY_TOKEN` / Supabase `whatsapp_verify_token`.

### 7. Al recibir una foto (consola roma-api)

Debes ver:

```
[webhook] pipeline imagen v3
[whatsapp-media] enrichInboundEventImage
[whatsapp-media] Imagen guardada para CRM
[webhook] image_url reemplazada para CRM
```

Y en `Normalized webhook events`, `image_url` con `/api/media/file/...`, **no** lookaside.

Prueba abrir en el navegador (debe verse la imagen, no 404):

`https://TU-NGROK.ngrok-free.dev/api/media/file/NOMBRE_ARCHIVO.jpg`

## CRM (tu otra máquina Laravel)

En `RomaCrm/.env`:

```env
ROMA_API_URL=https://periastral-honeydewed-mellisa.ngrok-free.dev/
ROMA_API_PUBLIC_URL=https://periastral-honeydewed-mellisa.ngrok-free.dev
PUBLIC_APP_URL=https://custody-rants-lazily.ngrok-free.dev
```

Opcional respaldo: `WA_TOKEN=` (mismo token que `meta_access_token` en Supabase).

## Archivos nuevos (v3) — checklist

- [ ] `src/lib/whatsapp-media-download.ts`
- [ ] `src/app/api/webhook/route.ts` (busca `MEDIA_PIPELINE_VERSION = 3`)
- [ ] `src/app/api/media/resolve-inbound/route.ts`
- [ ] `src/app/api/health/route.ts`
- [ ] `public/inbound-media/.gitkeep`
