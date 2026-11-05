## Context

Issue #23 (H-AUTH-01) reporta que credenciales manipuladas pueden iniciar sesión sin conocer la contraseña. El flujo actual de `POST /auth/login` en `auth/` es:

1. `AuthResource.login` valida `request`, `username` y `password` (400 si faltan o están en blanco).
2. Llama a `LegacyDatabase.findByCredentials(username, password)`.
3. Si devuelve `null`, responde 401; si no, `LegacyTokenUtil.create(...)` y responde 200 con `token`, `expiresIn`, `user` y `debug`.

La causa está en `auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java`: `findByCredentials` arma el SQL concatenando `username` y `password` dentro de literales entre comillas y lo ejecuta con `Statement`. Un valor con comillas altera la sentencia.

Análisis de precedencia (`AND` antes que `OR`) sobre la consulta actual, relevante para diseñar las pruebas:

| Entrada | WHERE resultante | Hoy |
|---|---|---|
| usuario `' OR '1'='1` y contraseña arbitraria | `username='' OR ('1'='1' AND password='x')` | falso → 401 |
| usuario `' OR '1'='1` y contraseña `' OR '1'='1` | `username='' OR '1'='1' AND password='' OR '1'='1'` | verdadero → 200 con token |
| usuario `student` y contraseña `' OR '1'='1` | `username='student' AND password='' OR '1'='1'` | verdadero → 200 con token |
| usuario `' OR '1'='1' --` y contraseña arbitraria | `username='' OR '1'='1' --...` | verdadero → 200 con token |

Por tanto, el escenario literal de la spec "valor de inyección como usuario" con una contraseña cualquiera ya devuelve 401 hoy; las pruebas deben incluir variantes explotables para que fallen antes del arreglo.

Pruebas existentes: `AuthResourceTest` (`@QuarkusTest`) cubre solo el login válido de `student`. La base SQLite (`./data/workshop.db`) se siembra en `LegacyDatabase.initialize()` con `student` y `trainer`.

## Goals / Non-Goals

**Goals**
- Que `findByCredentials` trate `username` y `password` siempre como datos, nunca como SQL.
- Cumplir los escenarios de `specs/auth-login/spec.md`: login válido 200 con `user.username` y `token`; credenciales con contenido de inyección en cualquiera de los campos, 401 sin `token`.
- Dejar pruebas automatizadas que protejan el contrato y reproduzcan el ataque.
- Cobertura de 85% o más sobre el código modificado (JaCoCo, ya configurado en `auth/pom.xml`).

**Non-Goals**
- Cambiar formato, firma, secreto o expiración del token (`LegacyTokenUtil`).
- Hashear contraseñas o cambiar el modelo/almacenamiento de `legacy_users`; se anota como seguimiento.
- Refactorizar `AuthResource.login` (anidamiento, constantes) o separar capas en este cambio.
- Cambiar el mensaje del 401 (hoy refleja el `username` recibido), el campo `debug`, CORS o el manejo de errores 500.
- Tocar `api/`, `web/`, dependencias, `docs/` o documentos generales.

## Contratos protegidos

- Ruta `POST /auth/login`, cuerpo `{username, password, client}`; `client` se ignora y las propiedades desconocidas siguen tolerándose (`quarkus.jackson.fail-on-unknown-properties=false`).
- Login válido: HTTP 200 con `user.username` y `token`. Se conservan además, sin modificarlos, `expiresIn` (3600), `user.displayName`, `user.role` y `debug`, porque el frontend y `api/` pueden depender de ellos.
- Validaciones previas: 400 por cuerpo nulo, usuario vacío o contraseña vacía, con sus mensajes actuales.
- Credenciales inexistentes o incorrectas: 401 con `message` y sin `token`.
- Esquema `legacy_users` y usuarios sembrados `student` / `trainer` con sus contraseñas de prueba.
- Variable `AUTH_DB_URL` y valor por defecto de la URL de base de datos.
- Firma pública `UserRecord findByCredentials(String, String)`, que devuelve `null` si no hay coincidencia.

## Componentes afectados

| Componente | Cambio |
|---|---|
| `auth/.../LegacyDatabase.java` | Reemplazar la concatenación por una consulta parametrizada en `findByCredentials`. |
| `auth/src/test/.../AuthResourceTest.java` | Ampliar con pruebas de caracterización y de rechazo de inyección. |
| `auth/src/test/.../LegacyDatabaseTest.java` (nuevo, opcional) | Pruebas directas de `findByCredentials` si hacen falta para la cobertura del código modificado. |

Sin cambios: `AuthResource`, `LegacyTokenUtil`, `LoginRequest`, `UserRecord`, `application.properties`, `pom.xml`.

## Decisiones técnicas

### D1. Consulta parametrizada con `PreparedStatement`

`SELECT id, username, display_name, role FROM legacy_users WHERE username = ? AND password = ?`, enlazando ambos valores con `setString`. Se conservan `DB_URL`, el mapeo a `UserRecord` y el retorno `null` ante ausencia de fila.

Alternativas consideradas:
- **Escapar comillas o lista negra de patrones (`OR`, `--`, `'`)**: descartada; es evadible y rechazaría contraseñas legítimas con esos caracteres.
- **Validar con regex en `AuthResource`**: descartada como defensa única; restringiría contraseñas válidas y deja la consulta vulnerable ante otras rutas de llamada. No se descarta como defensa adicional futura.
- **Migrar a JPA/Panache**: descartada; rediseño fuera de alcance.
- **Hashear contraseñas con comparación en Java**: es lo correcto a largo plazo, pero cambia el modelo de usuarios (fuera de alcance).

### D2. Fallar cerrado

Cualquier excepción en la consulta sigue devolviendo `null` (401), nunca un usuario. No se altera el manejo actual de excepciones para no ampliar el alcance.

### D3. El código de `AuthResource` no cambia

Los escenarios 401 se cumplen porque, tras D1, el valor de inyección es un literal sin coincidencia. No se agrega lógica de detección de patrones: "contenido de inyección" se rechaza por ser una credencial incorrecta, no por inspeccionarlo.

## Estrategia incremental

1. **Pruebas de caracterización del comportamiento a preservar** (verdes antes y después): login válido de `student` y de `trainer`, contraseña incorrecta (401), usuario inexistente (401), y los 400 por campos ausentes o vacíos.
2. **Pruebas de rechazo de inyección** con los casos de la spec y las variantes explotables de la tabla. Ejecutarlas antes del arreglo y registrar que las variantes explotables fallan (200 con token), como evidencia de reproducción.
3. **Cambio en `LegacyDatabase.findByCredentials`** (D1), como commit separado del de pruebas.
4. **Verificación**: todas las pruebas en verde y cobertura JaCoCo del código modificado >= 85%.

Cada paso es revisable por separado. Comandos: pruebas con `python tools/lab.py test auth` desde la raíz; Git y OpenSpec desde la raíz, en la rama `feature/h-auth-01`.

## Pruebas de caracterización necesarias antes de modificar

Mínimas, en `AuthResourceTest`:

| Caso | Entrada | Esperado |
|---|---|---|
| Login válido `student` | `student` / `Workshop123!` | 200, `user.username = student`, `token` no nulo |
| Login válido `trainer` | `trainer` / `Trainer123!` | 200, `user.username = trainer`, `token` no nulo |
| Forma de la respuesta válida | igual a `student` | `expiresIn = 3600`, `user.role`, `user.displayName` presentes |
| Contraseña incorrecta | `student` / `wrong` | 401, sin `token` |
| Usuario inexistente | `nobody` / `x` | 401, sin `token` |
| Campos vacíos o ausentes | usuario o contraseña en blanco o ausente | 400 |
| Inyección en usuario (spec) | `' OR '1'='1` / contraseña no vacía | 401, sin `token` |
| Inyección en contraseña (spec) | `student` / `' OR '1'='1` | 401, sin `token` |
| Inyección en ambos campos | `' OR '1'='1` / `' OR '1'='1` | 401, sin `token` |
| Inyección con comentario | `' OR '1'='1' --` / contraseña no vacía | 401, sin `token` |

Los datos de prueba son los usuarios sembrados ficticios; no se agregan secretos reales.

## Riesgos / Trade-offs

- **Pruebas rojas previas al arreglo**: son intencionales; se documenta la ejecución antes del cambio y no se integra una rama con pruebas fallando.
- **Dependencia de la base compartida `./data/workshop.db`**: las pruebas dependen del sembrado de `initialize()`; si el archivo existente tiene otro estado de `student` o `trainer`, pueden fallar por datos y no por el cambio. Mitigación: no escribir datos en las pruebas.
- **Riesgos residuales fuera de alcance**: contraseñas en texto plano, token Base64 sin firma con secreto embebido, mensaje 401 que refleja el `username`, `printStackTrace` y respuesta 500 con nombre de excepción. Quedan como hallazgos separados.
- **Cobertura**: `findByCredentials` queda cubierta por las pruebas HTTP; si JaCoCo mostrara el bloque `catch` como no cubierto, se evalúa una prueba directa antes de tolerar el hueco.
- **Compatibilidad**: sin cambio de firma ni de contrato; el único cambio de comportamiento es el rechazo de las entradas manipuladas.

## Rollback

El cambio de código es una modificación de un solo método en un commit propio. Se revierte con `git revert` de ese commit sin afectar las pruebas. No hay migraciones, cambios de esquema ni de configuración. Mantener las pruebas tras el rollback haría fallar las variantes de inyección, lo que es esperado e indica que la vulnerabilidad volvió a ser explotable.
