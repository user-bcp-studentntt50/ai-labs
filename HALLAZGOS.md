# Hallazgos

## API

Los hallazgos de `RETO.md` se contrastaron con el código de `api/`. El estado
`Pendiente` indica que el hallazgo está sustentado en el código y queda por
priorizar o corregir; no implica que se hayan ejecutado pruebas ni aprobado
cambios.

| id | componente | hallazgo | tipo | explicacion | evidencia (archivo:linea) | severidad | estado |
|---|---|---|---|---|---|---|---|
| H-API-01 | api | Token Base64 con secreto embebido y sin firma | Vulnerabilidad | El token se decodifica como texto y se acepta comparando un secreto fijo y una fecha; no se verifica una firma criptográfica, emisor ni audiencia. Quien pueda construir el contenido puede suplantar identidad o rol; el secreto también está en el código. | `api/app/security.py:9-22` | alta | Pendiente |
| H-API-02 | api | Acceso a tareas de otro `owner` | Vulnerabilidad | Las rutas y el alta vinculan el `owner` a `identity.username`, pero H-API-01 permite falsificar esa identidad mediante un token Base64. Un atacante puede suplantar otro propietario y consultar sus tareas. | `api/app/security.py:9-22,24-28; api/app/routes.py:38-63; api/tests/test_api.py:62-100` | alta | Pendiente — la regla de propietario depende de una identidad no autenticada criptográficamente; requiere resolver H-API-01 y probar rechazo de tokens falsificados. |
| H-API-03 | api | Filtros e inserts SQL concatenados | Vulnerabilidad | Valores de entrada se interpolan directamente en las consultas de lectura e inserción. Entradas con caracteres SQL pueden alterar consultas, exponer datos o cambiar la operación prevista. | `api/app/repositories.py:56-97; api/tests/test_api.py:108-118` | alta | Resuelto — filtros, inserts y lookup por ID usan parámetros enlazados. |
| H-API-04 | api | Carga de archivos usa el nombre recibido y lee el contenido completo | Vulnerabilidad | El nombre del cliente se combina directamente con el directorio de cargas y el contenido entero se lee antes de escribir. Esto puede permitir sobrescritura o escritura fuera del directorio previsto, y consumir memoria/almacenamiento sin límites de tamaño o extensión. | `api/app/services.py:78-92` | alta | Pendiente |
| H-API-05 | api | Versiones vulnerables fijadas de `urllib3` y `python-multipart` | Vulnerabilidad | Las versiones anteriores estaban afectadas por advisories revisados: urllib3 por GHSA-2xpw-w6gg-jr37, GHSA-gm62-xv2j-4w53 y GHSA-vxq7-64xx-v4gw; python-multipart por GHSA-5rvq-cxj2-64vf y GHSA-v9pg-7xvm-68hf. | `api/requirements.txt:4-5; https://github.com/advisories/GHSA-vxq7-64xx-v4gw; https://github.com/advisories/GHSA-5rvq-cxj2-64vf; https://github.com/advisories/GHSA-v9pg-7xvm-68hf` | alta | Resuelto — actualizados a `urllib3==2.8.0` y `python-multipart==0.0.31`; consulta final de advisories sin hallazgos. |
| H-API-06 | api | Responsabilidades de API, persistencia, autenticación y serialización concentradas en un módulo | Refactor | `main.py` concentraba autenticación, inicialización SQLite, serialización y rutas; el acoplamiento dificultaba probar y mantener cada responsabilidad. | `api/app/main.py:24-62; api/app/database.py:7-18; api/app/routes.py:1-86; api/app/services.py:27-125; api/app/repositories.py:38-97` | media | Resuelto — configuración, rutas, servicios, seguridad, persistencia y esquemas quedaron separados por capa. |
| H-API-07 | api | Tipado genérico, manejo amplio de excepciones y lógica anidada | Refactor | Requests y respuestas usaban `dict[str, Any]`, había conversiones permisivas y capturas amplias, y el resumen tenía condiciones anidadas; estas prácticas ocultaban errores y dificultaban el mantenimiento. | `api/app/schemas.py:1-59; api/app/security.py:12-22; api/app/services.py:56-115; api/app/main.py:59-63` | baja | Resuelto — se añadieron modelos Pydantic, errores genéricos, excepciones acotadas, constantes y resumen sin anidamiento profundo. |

## Auth

Hallazgos de `auth/` confirmados por una persona tras el Discovery. `CONFIRMADO`
habilita spec y backlog; no implica que se hayan ejecutado pruebas ni aprobado
una solución. Las referencias de línea son de la revisión de código del Discovery.

| id | componente | hallazgo | tipo | explicacion | evidencia (archivo:linea) | severidad | estado |
|---|---|---|---|---|---|---|---|
| H-AUTH-01 | auth | SQL de login armado por concatenación | Vulnerabilidad | `findByCredentials` concatena `username` y `password` en el SQL; una entrada manipulada puede alterar la consulta y autenticar sin la contraseña. | `auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java:32` | alta | CONFIRMADO — Issue #23; spec en `openspec/changes/address-h-auth-01/` |
| H-AUTH-02 | auth | Token Base64 sin firma que incluye el secreto | Vulnerabilidad | El token es `Base64(username\|role\|expiración\|secreto)`; el secreto está en el código y viaja en cada token, por lo que se puede leer y fabricar tokens. `api/` acepta el mismo formato (H-API-01). | `auth/src/main/java/com/bcp/workshop/auth/LegacyTokenUtil.java:8-15` | alta | CONFIRMADO — spec en `openspec/changes/address-h-auth-02-token-integrity/` |
| H-AUTH-03 | auth | Contraseñas almacenadas en texto plano | Vulnerabilidad | `legacy_users.password` guarda y compara el valor en claro; los usuarios sembrados usan contraseñas conocidas. | `auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java:22-24,32` | media-alta | CONFIRMADO — spec en `openspec/changes/address-h-auth-03-password-storage/` |
| H-AUTH-04 | auth | Respuestas con detalles internos y campo `debug` | Vulnerabilidad | El 500 devuelve mensaje y clase de la excepción; el 401 refleja el usuario recibido; el 200 incluye `debug`; un fallo de persistencia se traduce en 401. | `auth/src/main/java/com/bcp/workshop/auth/AuthResource.java:37,48,54-57; auth/src/main/java/com/bcp/workshop/auth/LegacyDatabase.java:38-42` | media | CONFIRMADO — spec en `openspec/changes/address-h-auth-04-error-disclosure/` |
| H-AUTH-05 | auth | CORS abierto a cualquier origen y dependencias sin advisory verificado | Configuración / SCA | CORS acepta cualquier origen y `%prod` escucha en `0.0.0.0`; Quarkus `3.27.4`, Commons Text `1.9` y `sqlite-jdbc 3.50.3.0` están fijados sin advisory consultado (el secreto hardcodeado se cubre en H-AUTH-02). | `auth/src/main/resources/application.properties:3-7; auth/pom.xml (properties y dependencies)` | media | CONFIRMADO — spec en `openspec/changes/address-h-auth-05-cors-and-dependencies/` |

## Contrato observado (sin contrato acordado documentado)

No existe `docs/ENDPOINTS.md` en el workspace. Lo siguiente se deriva de las
rutas y serialización presentes en `api/app/main.py`; es una observación del
código, no una aprobación de contrato.

| Ruta | Contrato observado | Evidencia |
|---|---|---|
| `GET /api/tasks` | Requiere `Authorization`; acepta `owner` opcional y devuelve una lista de tareas con `id`, `title`, `description`, `status`, `owner`, `priority` y `createdAt`. Si se omite `owner`, usa el usuario del token. | `api/app/routes.py:38-45; api/app/schemas.py:24-33; api/app/services.py:27-35` |
| `POST /api/tasks` | Requiere `Authorization`; recibe un objeto JSON, aplica valores predeterminados a algunos campos, crea una tarea y devuelve la tarea serializada con estado 201. | `api/app/routes.py:47-54; api/app/schemas.py:14-22; api/app/services.py:39-54` |
| `GET /api/summary` | Requiere `Authorization`; acepta `owner` opcional y devuelve `owner`, `total`, `byStatus` y `highPriorityOpen`. | `api/app/routes.py:56-63; api/app/schemas.py:36-43; api/app/services.py:56-76` |
| `POST /api/requirements` | Requiere `Authorization`; recibe el campo multipart `file`, guarda su contenido y devuelve `owner`, `fileName`, `storedAt` y `size`, con estado 201. | `api/app/routes.py:65-76; api/app/schemas.py:45-52; api/app/services.py:78-92` |
| `GET /api/backend-health` | Requiere `Authorization`; consulta la URL de `AUTH_HEALTH_URL` (o `http://localhost:8080/q/health`) y devuelve `requestedBy`, `status` y `body`. | `api/app/routes.py:78-85; api/app/schemas.py:54-59; api/app/services.py:95-115` |

### Flujo y riesgos observados

- **Token:** se elimina el texto `Bearer `, se decodifica Base64 y se separa
  `username|role|expiración|secreto`; se compara el secreto fijo y se rechaza
  una expiración anterior al tiempo actual. No hay firma, emisor ni audiencia.
  Los errores de validación se exponen ahora con un detalle HTTP 401 genérico.
  (`api/app/security.py:9-22`)
- **SQLite:** `create_app` crea el directorio y abre una conexión compartida;
  la inicialización, las semillas y las consultas se delegan al repositorio.
  La conexión se cierra al terminar el ciclo de vida de la aplicación.
  (`api/app/main.py:24-41`, `api/app/database.py:7-18`,
  `api/app/repositories.py:38-97`)
- **Archivos:** el destino se construye con el nombre recibido, el archivo se
  lee completo en memoria y se escribe sin límites ni validaciones visibles de
  nombre, extensión o tamaño. (`api/app/services.py:78-92`)

Durante el Discovery no se ejecutaron pruebas ni análisis SCA. Las validaciones
posteriores y su evidencia se registran en `PLAN.md`.

### Candidatos Discovery para revisión humana

#### H-API-08 — Política CORS permite cualquier origen con credenciales habilitadas
- Estado: CANDIDATO
- Evidencia: `api/app/main.py:50-54` configura `allow_origins=["*"]`, `allow_credentials=True` y comodines para métodos y headers.
- Impacto: la API no limita los orígenes permitidos; además, las solicitudes de navegador con modo de credenciales pueden no interoperar con el origen comodín. El efecto depende de los orígenes y del modo de autenticación usados por los clientes.
- Prioridad propuesta: Media, pendiente de confirmar los clientes y el uso de credenciales cross-origin.
- Contrato potencialmente afectado: política CORS de los endpoints `/api/*`, especialmente preflight y solicitudes que envían `Authorization`.
- Cómo validarlo: ejecutar preflight desde el origen real del frontend y probar en navegador la solicitud con el modo de credenciales que use el cliente; comparar los headers de respuesta con los orígenes permitidos acordados.

#### H-API-09 — `status` y `priority` aceptan valores sin dominio validado
- Estado: CANDIDATO
- Evidencia: `api/app/schemas.py:14-21` declara ambos campos como `str` sin restricciones de valores; `api/app/services.py:65-74` agrega los estados recibidos y cuenta prioridad alta solo cuando el valor es exactamente `HIGH`. Las pruebas ejercitan valores conocidos en `api/tests/test_api.py:92-100`, pero no documentan el conjunto permitido.
- Impacto: valores arbitrarios o con distinta capitalización pueden persistirse y aparecer como categorías distintas en `byStatus`, mientras `highPriorityOpen` podría no contarlos como prioridad alta. El impacto depende de que exista un dominio de valores esperado.
- Prioridad propuesta: Media, pendiente de confirmar el dominio de estados y prioridades con el responsable del contrato.
- Contrato potencialmente afectado: cuerpo de `POST /api/tasks` (`status`, `priority`) y respuesta de `GET /api/summary` (`byStatus`, `highPriorityOpen`).
- Cómo validarlo: enviar valores no reconocidos y con distinta capitalización a `POST /api/tasks`; comprobar respuesta, persistencia y efecto en el resumen, y contrastar el resultado con el dominio aprobado.

#### H-API-10 — El endpoint de health-check retransmite el cuerpo del servicio de autenticación
- Estado: CANDIDATO
- Evidencia: `api/app/services.py:98-114` decodifica `response.data` y devuelve el contenido sin filtrado en `body`; `api/app/routes.py:78-85` expone el servicio en `GET /api/backend-health`. La prueba `api/tests/test_api.py:199-223` confirma que se devuelve el cuerpo recibido.
- Impacto: cualquier dato incluido por el servicio de autenticación en su respuesta queda disponible a través de este endpoint para quienes puedan invocarlo. No se ha confirmado que el cuerpo real contenga información sensible.
- Prioridad propuesta: Media, sujeta al contenido real del health-check y al alcance de acceso del endpoint.
- Contrato potencialmente afectado: respuesta de `GET /api/backend-health`, campo `body`.
- Cómo validarlo: usar una respuesta sintética del upstream con un marcador no sensible y comprobar que se retransmite; revisar el esquema real permitido del health-check y decidir si requiere lista permitida o redacción.
