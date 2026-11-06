# Spec Delta

## Purpose

Define el contenido permitido de las respuestas de error y de éxito de `POST /auth/login` y el registro de errores del servidor.

## ADDED Requirements

### Requirement: Las validaciones de entrada conservan su respuesta
El sistema SHALL continuar respondiendo 400 con su mensaje actual cuando falta el cuerpo, el usuario o la contraseña.

#### Scenario: Usuario vacío
- **WHEN** un cliente envía un usuario vacío o en blanco a `POST /auth/login`
- **THEN** la respuesta tiene estado HTTP 400 y el mensaje `Username is required`

#### Scenario: Contraseña vacía
- **WHEN** un cliente envía una contraseña vacía o en blanco a `POST /auth/login`
- **THEN** la respuesta tiene estado HTTP 400 y el mensaje `Password is required`

### Requirement: Los errores internos no exponen detalles al cliente
El sistema SHALL responder a un fallo interno con un mensaje genérico y SHALL NOT incluir el mensaje de la excepción ni el nombre de su clase en el cuerpo.

#### Scenario: Fallo inesperado durante el login
- **WHEN** ocurre un fallo interno no controlado al procesar `POST /auth/login`
- **THEN** la respuesta tiene un estado HTTP de error de servidor
- **AND** el cuerpo no contiene el mensaje original de la excepción, el nombre de su clase ni el campo `exception`

### Requirement: Un fallo de persistencia no se presenta como credenciales inválidas
El sistema SHALL NOT responder 401 cuando la consulta de credenciales falla por un error de acceso a datos.

#### Scenario: Base de datos no disponible
- **WHEN** la base de datos no está disponible durante un login con credenciales válidas
- **THEN** la respuesta tiene un estado HTTP de error de servidor distinto de 401
- **AND** no incluye un `token`
- **AND** el cuerpo no contiene detalles internos

### Requirement: El 401 no refleja el usuario recibido
El sistema SHALL NOT incluir el valor de `username` enviado por el cliente en el cuerpo de una respuesta 401.

#### Scenario: Usuario con marcado HTML
- **WHEN** un cliente envía como usuario el texto `<b>x</b>` con una contraseña incorrecta
- **THEN** la respuesta tiene estado HTTP 401 y no incluye un `token`
- **AND** el cuerpo no contiene el texto `<b>x</b>`

### Requirement: La respuesta exitosa no incluye campos de depuración
El sistema SHALL NOT incluir el campo `debug` en la respuesta 200, y SHALL conservar `token`, `expiresIn` y `user`.

#### Scenario: Login válido sin campo de depuración
- **WHEN** un cliente envía `student` y `Workshop123!` a `POST /auth/login`
- **THEN** la respuesta tiene estado HTTP 200 e incluye `token`, `expiresIn` y `user.username`, `user.displayName` y `user.role`
- **AND** no incluye un campo `debug`

### Requirement: Los errores se registran en el servidor sin datos sensibles
El sistema SHALL registrar los fallos internos en el log del servidor y SHALL NOT registrar contraseñas ni tokens.

#### Scenario: Registro de un fallo de persistencia
- **WHEN** ocurre un fallo de acceso a datos durante un login
- **THEN** el log del servidor contiene un registro del error
- **AND** ningún registro contiene la contraseña enviada ni un token

## Riesgos, supuestos y preguntas abiertas

- Cambiar el texto del 401 y retirar `debug` son decisiones de contrato (ver `proposal.md`); esta spec asume que ambas se aprueban.
- `web/` muestra el `message` del backend con `[innerHTML]` y compone otro mensaje con el usuario; corregirlo en `web/` queda fuera de este cambio.
- El estado exacto del error interno (500 u otro) se define con el Architect y el responsable del contrato.
