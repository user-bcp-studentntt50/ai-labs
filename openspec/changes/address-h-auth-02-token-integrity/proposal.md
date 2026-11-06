# Proposal

## Why

H-AUTH-02 (CONFIRMADO) — `auth/src/main/java/com/bcp/workshop/auth/LegacyTokenUtil.java:8-15`. El token que emite `POST /auth/login` es `Base64(username|role|expiración|secreto)`. Cualquier portador puede decodificarlo, leer el secreto y fabricar tokens con otro usuario o rol; `api/` acepta el mismo formato (H-API-01). El cambio define propiedades verificables del token y del manejo del secreto, sin elegir la solución técnica.

## What Changes

- El token emitido no revela el secreto y su contenido no puede alterarse sin ser detectado por quien lo verifica.
- El secreto no vive en el código fuente.
- El token conserva su expiración y es coherente con `expiresIn`.
- El login válido conserva su respuesta actual.
- **Dentro del alcance:** comportamiento observable del token emitido por `auth/`, origen del secreto y pruebas en `auth/`.
- **Fuera del alcance:**
  - Cambios en `api/` o `web/`; solo se valida su compatibilidad.
  - Hash de contraseñas (H-AUTH-03), SQL (H-AUTH-01), mensajes de error (H-AUTH-04) y CORS (H-AUTH-05).
  - Elegir el algoritmo o la librería (HMAC, JWT u otro): decisión del Architect.

## Contratos protegidos

- `POST /auth/login`: cuerpo `{username, password, client}`; respuesta 200 con `token`, `expiresIn` y `user` (`username`, `displayName`, `role`). `web/` usa `token` y `user.displayName`/`user.username`.
- Formato de token que hoy acepta `api/app/security.py` (`GET/POST /api/tasks`, `GET /api/summary`, `POST /api/requirements`). **Cambiarlo es una decisión explícita**, no un detalle de implementación: requiere acordar con el responsable de `api/` si se migra en el mismo release, con convivencia o por separado.

## Capabilities

### New Capabilities
- `auth-token`: propiedades observables del token emitido por el login.

### Modified Capabilities
- Ninguna.

## Impact

`auth/` (emisión del token, configuración del secreto, pruebas). Riesgo de ruptura con `api/` si cambia el formato sin coordinación.

## Preguntas abiertas (requieren decisión humana)

1. ¿El cambio de formato de token se coordina con `api/` en el mismo release o queda detrás de una migración acordada?
2. ¿Qué claims son obligatorios? `HU-01.md` propone `sub`, `client`, `iat` y `exp`, pero esa historia está marcada "usable con ajustes" y no es un hallazgo confirmado; además describe HMAC y `AUTH_TOKEN_SECRET`, que no existen en el código actual.
3. ¿Qué debe ocurrir si el secreto no está configurado (rechazar el arranque, fallar el login u otro)?
4. ¿Se requiere rotación del secreto o invalidación de tokens ya emitidos?
