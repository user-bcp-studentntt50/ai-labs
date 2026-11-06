# Spec Delta

## Purpose

Define propiedades verificables del token emitido por `POST /auth/login` y del manejo de su secreto, preservando el contrato de login exitoso.

## ADDED Requirements

### Requirement: El login válido conserva el contrato de respuesta exitosa
El sistema SHALL continuar autenticando credenciales válidas con HTTP 200 e incluyendo `token`, `expiresIn` y `user.username`, `user.displayName` y `user.role`.

#### Scenario: Login con credenciales válidas
- **WHEN** un cliente envía `student` y `Workshop123!` a `POST /auth/login`
- **THEN** la respuesta tiene estado HTTP 200
- **AND** incluye `token` no vacío, `expiresIn` y `user.username` igual a `student`

### Requirement: El token emitido no revela el secreto
El sistema SHALL emitir tokens cuyo contenido, decodificado con cualquier codificación estándar de texto, no contiene el valor del secreto usado para emitirlos.

#### Scenario: El secreto no es recuperable desde el token
- **WHEN** se obtiene un token mediante un login válido y se decodifica su contenido
- **THEN** ninguna parte decodificada contiene el valor del secreto configurado

### Requirement: La alteración del token es detectable
El sistema SHALL emitir tokens de modo que quien los verifique pueda detectar que su contenido (usuario, rol o expiración) fue modificado después de la emisión.

#### Scenario: Un token con contenido alterado no pasa la verificación
- **WHEN** se modifica el usuario, el rol o la expiración de un token emitido por un login válido y se somete a verificación
- **THEN** la verificación lo rechaza

#### Scenario: Un token sin alterar pasa la verificación
- **WHEN** se somete a verificación un token recién emitido por un login válido
- **THEN** la verificación lo acepta y reconoce el usuario y rol del login

### Requirement: El token conserva la expiración y es coherente con `expiresIn`
El sistema SHALL incluir una expiración verificable en el token, coherente con el valor `expiresIn` de la respuesta dentro de una tolerancia documentada.

#### Scenario: La expiración coincide con `expiresIn`
- **WHEN** se obtiene un token mediante un login válido
- **THEN** el tiempo de expiración del token menos el momento de emisión coincide con `expiresIn` dentro de la tolerancia documentada

#### Scenario: Un token vencido es rechazado por la verificación
- **WHEN** se somete a verificación un token cuya expiración ya pasó
- **THEN** la verificación lo rechaza

### Requirement: El secreto no está en el código fuente
El sistema SHALL obtener el secreto de una fuente de configuración externa al código y SHALL NOT incluir un valor de secreto de producción en el repositorio.

#### Scenario: El repositorio no contiene el secreto literal
- **WHEN** se busca en el código fuente de `auth/` el valor literal del secreto anterior (`WORKSHOP_SECRET_2026`)
- **THEN** no aparece en código de producción, configuración versionada ni respuestas de la API

#### Scenario: Las pruebas usan un valor aislado
- **WHEN** se ejecutan las pruebas de `auth/`
- **THEN** usan un secreto de prueba que no coincide con ningún valor de producción

### Requirement: La compatibilidad con `api/` es una decisión explícita
El sistema SHALL NOT impedir que `api/` autentique a usuarios con un token de login válido, salvo que exista una decisión registrada que acuerde la migración del formato.

#### Scenario: Un token de login válido es aceptado por `api/`
- **WHEN** un token obtenido de un login válido se envía como `Authorization: Bearer <token>` a `GET /api/tasks`
- **THEN** `api/` responde 200 mientras no exista una decisión de migración registrada

## Riesgos, supuestos y preguntas abiertas

- Supuesto: la verificación del token ocurre en el consumidor (`api/`); `auth/` no expone hoy un endpoint de verificación. Dónde se ejecuta la prueba de alteración depende de la decisión del Architect.
- Las preguntas abiertas están en `proposal.md`.
