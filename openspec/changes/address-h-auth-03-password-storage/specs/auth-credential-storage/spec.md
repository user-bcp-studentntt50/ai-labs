# Spec Delta

## Purpose

Define cómo se almacenan y verifican las contraseñas de `legacy_users`, preservando el comportamiento observable del login.

## ADDED Requirements

### Requirement: Las contraseñas no se almacenan en forma recuperable
El sistema SHALL NOT guardar la contraseña de un usuario en `legacy_users` de modo que pueda leerse directamente.

#### Scenario: El valor almacenado no coincide con la contraseña
- **WHEN** se inicializa una base nueva y se lee el valor almacenado para `student` en `legacy_users`
- **THEN** el valor almacenado no es igual a `Workshop123!`

#### Scenario: Contraseñas iguales no producen valores almacenados idénticos
- **WHEN** dos usuarios distintos se crean con la misma contraseña
- **THEN** sus valores almacenados difieren

### Requirement: El login con credenciales correctas conserva su contrato
El sistema SHALL continuar autenticando con la contraseña correcta, con la respuesta 200 existente.

#### Scenario: Login válido de un usuario sembrado
- **WHEN** un cliente envía `student` y `Workshop123!` a `POST /auth/login`
- **THEN** la respuesta tiene estado HTTP 200 e incluye `user.username` igual a `student` y un `token`

#### Scenario: Login válido del segundo usuario sembrado
- **WHEN** un cliente envía `trainer` y `Trainer123!` a `POST /auth/login`
- **THEN** la respuesta tiene estado HTTP 200 e incluye `user.username` igual a `trainer` y un `token`

### Requirement: Las contraseñas incorrectas siguen siendo rechazadas
El sistema SHALL responder 401 sin `token` cuando la contraseña no corresponde al usuario.

#### Scenario: Contraseña incorrecta
- **WHEN** un cliente envía `student` y una contraseña distinta de `Workshop123!` a `POST /auth/login`
- **THEN** la respuesta tiene estado HTTP 401 y no incluye un `token`

#### Scenario: Usuario inexistente
- **WHEN** un cliente envía un usuario que no existe a `POST /auth/login`
- **THEN** la respuesta tiene estado HTTP 401 y no incluye un `token`

### Requirement: Las bases existentes no dejan usuarios sin acceso
El sistema SHALL permitir que un usuario creado antes del cambio inicie sesión con su contraseña actual tras actualizar el servicio.

#### Scenario: Base creada con la versión anterior
- **WHEN** se arranca la versión nueva sobre una base creada con contraseñas en texto plano y `student` envía `Workshop123!` a `POST /auth/login`
- **THEN** la respuesta tiene estado HTTP 200 e incluye un `token`

## Riesgos, supuestos y preguntas abiertas

- Pendiente de decisión: qué ocurre con el valor en texto plano de una base existente tras el primer arranque o login (ver `proposal.md`). Esta spec solo exige que el acceso se conserve.
- Riesgo: el cambio altera el contenido de `legacy_users` y puede dejar incompatibles las bases ya creadas si no se define la migración.
- Dependencia: comparte `findByCredentials` con H-AUTH-01.
