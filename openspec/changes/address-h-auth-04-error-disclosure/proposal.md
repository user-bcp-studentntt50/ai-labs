# Proposal

## Why

H-AUTH-04 (CONFIRMADO) — `auth/src/main/java/com/bcp/workshop/auth/AuthResource.java:37,48,54-57` y `LegacyDatabase.java:38-42`:

- El 500 devuelve `error.getMessage()` y el nombre de la clase de la excepción.
- El 401 refleja el usuario recibido ("Invalid user <username> or password").
- El 200 incluye un campo `debug`.
- `findByCredentials` captura cualquier excepción, hace `printStackTrace()` y devuelve `null`, de modo que un fallo de persistencia se responde como 401 (credenciales inválidas).

## What Changes

- Los errores internos no exponen mensajes ni clases de excepción al cliente.
- Un fallo de persistencia no se presenta como credenciales inválidas.
- El 401 no refleja el valor del usuario enviado.
- La respuesta exitosa no incluye campos de depuración.
- Los errores se registran en el servidor sin contraseñas ni tokens.
- **Dentro del alcance:** cuerpos de respuesta de error y campo `debug` de `POST /auth/login`, y el registro de errores en `auth/`.
- **Fuera del alcance:** cambios en `api/` o `web/`; validaciones 400 (se conservan); formato del token; CORS; refactor de capas del resource.

## Contratos protegidos

- `POST /auth/login`:
  - 400 por cuerpo nulo, usuario vacío o contraseña vacía, con los mensajes actuales.
  - 401 con `message` y sin `token` para credenciales inválidas.
  - 200 con `token`, `expiresIn` y `user` para credenciales válidas.
- `web/` lee `response.data.message` y lo muestra con `[innerHTML]`; también usa `user.displayName`. `web/` no usa `debug`.
- **Decisiones de contrato que requieren aprobación explícita:**
  1. Cambiar el texto del `message` del 401.
  2. Retirar `debug` del 200.
  3. Qué estado y mensaje devuelve un fallo interno (hoy 500 con detalle).

## Capabilities

### New Capabilities
- `auth-error-responses`: contenido de las respuestas de error y de depuración del login.

### Modified Capabilities
- Ninguna.

## Impact

`auth/` (resource y acceso a datos, pruebas). `web/` muestra el `message` del backend; un cambio de texto afecta lo que ve el usuario aunque no rompa la integración.

## Preguntas abiertas (requieren decisión humana)

1. ¿Qué estado HTTP y mensaje genérico usar ante un fallo de persistencia (500 u otro 5xx)?
2. ¿Se mantiene el texto exacto del 401 sin el usuario, o se acuerda uno nuevo con `web/`?
3. ¿Algún consumidor externo depende de `debug`? En el código de `web/` y `api/` no se encontró uso.
