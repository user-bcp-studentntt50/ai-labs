# Spec Delta

## Purpose

Define la política CORS de `auth/` y el estado de seguridad de sus dependencias directas, preservando el login y el health check.

## ADDED Requirements

### Requirement: Solo los orígenes acordados reciben permiso CORS
El sistema SHALL permitir solicitudes de navegador solo desde los orígenes de una lista acordada y configurable, y SHALL NOT permitir cualquier origen.

#### Scenario: Origen permitido
- **WHEN** un navegador envía un preflight `OPTIONS /auth/login` desde un origen de la lista acordada, con método `POST` y headers `content-type`
- **THEN** la respuesta permite ese origen, el método y los headers solicitados

#### Scenario: Origen no listado
- **WHEN** un navegador envía un preflight `OPTIONS /auth/login` desde un origen que no está en la lista acordada
- **THEN** la respuesta no concede permiso CORS para ese origen

### Requirement: El login desde el frontend conserva su funcionamiento
El sistema SHALL continuar permitiendo que `web/` ejecute `POST /auth/login` desde su origen acordado.

#### Scenario: Login desde el origen del frontend
- **WHEN** el origen acordado de `web/` envía `student` y `Workshop123!` a `POST /auth/login`
- **THEN** la respuesta tiene estado HTTP 200 con `token` y `user.username` igual a `student`
- **AND** incluye el encabezado de permiso CORS para ese origen

### Requirement: La lista de orígenes es configuración externa
El sistema SHALL tomar los orígenes permitidos de configuración por entorno y SHALL NOT requerir cambiar código para ajustarlos.

#### Scenario: Cambio de origen sin modificar código
- **WHEN** se cambia la lista de orígenes en la configuración del entorno y se reinicia el servicio
- **THEN** el preflight refleja la nueva lista

### Requirement: Las dependencias directas no tienen advisories de alta severidad sin excepción documentada
El sistema SHALL NOT incluir dependencias directas con advisories conocidos de severidad alta o crítica, salvo una excepción documentada y aprobada.

#### Scenario: Revisión de dependencias sin hallazgos bloqueantes
- **WHEN** se consulta el estado de los advisories de las dependencias directas de `auth/` (por ejemplo, con el workflow Dependency Review)
- **THEN** no hay advisories de severidad alta o crítica, o cada uno tiene una excepción documentada

### Requirement: La actualización de dependencias conserva el comportamiento
El sistema SHALL conservar el contrato de login y de health tras cualquier cambio de dependencias.

#### Scenario: Pruebas tras actualizar
- **WHEN** se ejecuta `mvn test` desde `auth/` con las dependencias actualizadas
- **THEN** las pruebas existentes pasan y el login válido responde 200 con `token` y `user.username`

#### Scenario: Health check disponible
- **WHEN** se consulta `GET /q/health` con el servicio en ejecución
- **THEN** la respuesta mantiene su estado HTTP y formato previos

## Riesgos, supuestos y preguntas abiertas

- Supuesto: no se ha confirmado que las versiones actuales sean vulnerables; el primer paso es consultar los advisories de las versiones exactas y registrar el resultado.
- Riesgo: una lista de orígenes incompleta bloquea el login de `web/` en algún entorno.
- Riesgo: actualizar Quarkus o Commons Text puede cambiar comportamiento (por ejemplo, el escape de `displayName`); debe verificarse con pruebas.
- Las preguntas abiertas están en `proposal.md`.
