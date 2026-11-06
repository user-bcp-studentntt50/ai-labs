# Proposal

## Why

H-AUTH-05 (CONFIRMADO):

- `auth/src/main/resources/application.properties:4-7` habilita CORS con `quarkus.http.cors.origins=/.*/` (cualquier origen).
- `auth/pom.xml` fija Quarkus `3.27.4`, Commons Text `1.9` y `sqlite-jdbc 3.50.3.0` sin un advisory consultado para estas versiones. No se afirma que sean vulnerables.

El secreto hardcodeado, que `RETO.md` agrupa con la configuración, se cubre en H-AUTH-02.

## What Changes

- Solo los orígenes acordados pueden consumir `auth/` desde un navegador.
- Las dependencias directas de `auth/` quedan sin advisories conocidos de severidad alta o crítica, o con una excepción documentada.
- El login válido y la ejecución de `mvn test` desde `auth/` no cambian.
- **Dentro del alcance:** configuración CORS y dependencias de `auth/`.
- **Fuera del alcance:**
  - Cambios en `api/` o `web/`.
  - Secreto del token (H-AUTH-02), SQL, contraseñas y errores.
  - Enlace `%prod` a `0.0.0.0`: no hay evidencia de problema y puede ser necesario en contenedor (`auth/Dockerfile`).
  - Escape de `displayName` con Commons Text; si la actualización lo cambia, hay que decidirlo explícitamente.

## Contratos protegidos

- `POST /auth/login` y `GET /q/health` (consumido por `GET /api/backend-health`) mantienen sus respuestas.
- `web/` llama al login desde el navegador a `http://localhost:8080/auth/login`; su origen debe seguir permitido. **Quitar un origen que hoy funciona es una decisión explícita.**
- Respuesta de login: `token`, `expiresIn`, `user.username`, `user.displayName`, `user.role`.

## Capabilities

### New Capabilities
- `auth-service-config`: política CORS y estado de dependencias de `auth/`.

### Modified Capabilities
- Ninguna.

## Impact

`auth/` (configuración, `pom.xml`, pruebas). Actualizar Quarkus puede afectar el comportamiento del runtime; hay ramas de Dependabot abiertas con versiones candidatas, que no son una decisión aprobada.

## Preguntas abiertas (requieren decisión humana)

1. ¿Cuáles son los orígenes legítimos de `web/` en cada entorno (local, contenedor, producción)?
2. ¿Los métodos `PUT`/`DELETE` y los headers habilitados son necesarios? Hoy no hay endpoints que los usen.
3. ¿Qué severidad de advisory bloquea y cómo se documenta una excepción?
4. Antes de actualizar, hay que consultar los advisories de las versiones exactas para confirmar si hay riesgo real.
