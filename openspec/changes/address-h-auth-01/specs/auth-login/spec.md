# Spec Delta

## Purpose

Define el comportamiento observable del login para credenciales válidas y valores de credenciales que intentan eludir la autenticación, preservando la respuesta de login exitoso.

## ADDED Requirements

### Requirement: Las credenciales válidas conservan el contrato de login exitoso
El sistema SHALL continuar autenticando credenciales válidas con el contrato de respuesta exitosa existente.

#### Scenario: Login con credenciales válidas
- **WHEN** un cliente envía las credenciales válidas `student` y `Workshop123!` a `POST /auth/login`
- **THEN** la respuesta tiene estado HTTP 200 e incluye `user.username` igual a `student` y un `token`

### Requirement: Las credenciales con contenido de inyección son rechazadas
El sistema SHALL tratar los valores con contenido de inyección en cualquiera de los campos de credenciales como inválidos y SHALL NOT emitir un token para la solicitud.

#### Scenario: Se rechaza el valor de inyección como usuario
- **WHEN** un cliente envía `' OR '1'='1` como usuario a `POST /auth/login`
- **THEN** la respuesta tiene estado HTTP 401 y no incluye un `token`

#### Scenario: Se rechaza el valor de inyección como contraseña
- **WHEN** un cliente envía `' OR '1'='1` como contraseña a `POST /auth/login`
- **THEN** la respuesta tiene estado HTTP 401 y no incluye un `token`