# Proposal

## Why

El [Issue #23](https://github.com/user-bcp-studentntt50/ai-labs/issues/23), asociado al hallazgo H-AUTH-01, reporta que valores de credenciales manipulados pueden permitir iniciar sesión sin conocer la contraseña. El cambio define el rechazo observable de esos intentos y reduce el riesgo de acceso no autorizado, preservando el login válido.

## What Changes

- Definir que credenciales con contenido de inyección no autentican al usuario y no producen un token.
- Preservar el resultado documentado por el Issue para credenciales válidas: HTTP 200 con `user.username` y `token`.
- Mantener sin cambios la ruta `POST /auth/login` y su contrato para el login válido.
- **Dentro del alcance:** comportamiento de autenticación en `auth/` y sus pruebas.
- **Fuera del alcance:** cambios en `api/` o `web/`, formato o ciclo de vida del token, modelo de usuarios, contrato de otros endpoints y decisiones de implementación técnica.

El baseline de `docs/ENDPOINTS.md` documenta endpoints de la API ReqFlow, pero no define `POST /auth/login`. Por tanto, los escenarios de login de este cambio complementan ese baseline con los resultados comprometidos en el Issue; no alteran un contrato de login documentado allí ni los contratos de la API.

## Capabilities

### New Capabilities
- `auth-login`: resultados observables del login para credenciales válidas y entradas de credenciales manipuladas.

### Modified Capabilities
- Ninguna.

## Impact

El alcance funcional y de pruebas se limita a `auth/` y a `POST /auth/login`. No se modifican código funcional, contratos de `api/` o `web/`, dependencias ni documentos generales.