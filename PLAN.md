# Plan

## API — corrección de H-API-01 a H-API-07

**Estado:** implementación parcial. H-API-02, H-API-03, H-API-05, H-API-06
y H-API-07 resueltos. H-API-01 y H-API-04 permanecen pendientes por datos de
coordinación externa que no deben suponerse.
**Base observada:** [HALLAZGOS.md](./HALLAZGOS.md), sección API. No existe
`docs/ENDPOINTS.md`; se toma como contrato observado el comportamiento derivado
originalmente de `api/app/main.py`, ahora con evidencia actualizada en
`HALLAZGOS.md`.

**Aprobados:** H-API-01, H-API-02, H-API-03, H-API-04, H-API-05, H-API-06 y H-API-07.  
**Pendientes de aprobación:** ninguno. Esta selección sustituye las
aprobaciones parciales indicadas previamente.

### Compatibilidad y dependencias previas

- Mantener rutas, métodos HTTP, campos JSON de éxito y códigos de éxito
  observados: `GET /api/tasks`, `POST /api/tasks`, `GET /api/summary`,
  `POST /api/requirements` y `GET /api/backend-health`. Las pruebas de
  caracterización deben fijar primero sus formas actuales.
- La sustitución del token Base64 por JWT implica que el emisor actual deberá
  producir tokens firmados con emisor y audiencia acordados. Coordinar ese
  cambio fuera de `api/` antes de desplegar la nueva verificación; no aceptar
  simultáneamente el formato Base64 como mecanismo alternativo, pues conservaría
  la suplantación. No se presupone que esa coordinación o aprobación ya ocurrió.
- Antes de implementar la validación de archivos, acordar con el responsable del
  producto la lista de extensiones permitidas y el tamaño máximo. El código y la
  prueba actual solo demuestran la carga de un `.txt` pequeño; no justifican
  valores o una política más amplia.
- No afirmar CVE para dependencias sin evidencia. La evaluación SCA determinará
  si procede cambiar las versiones. Toda dependencia nueva requiere justificar
  su necesidad, mantenimiento y compatibilidad.

## H-API-01 — Token Base64 con secreto embebido y sin firma

**Aprobación:** aprobada por el usuario.

**Implementación:** pendiente; falta coordinar los valores de emisor, audiencia
y claim de identidad. No se modificó la autenticación para evitar romper
clientes que aún envíen el token observado.
El usuario confirmó que el emisor puede emitir JWT con HS256; los valores
esperados de `iss`, `aud` y el claim de identidad todavía no están definidos.
La solicitud de esos valores se canceló; H-API-01 permanece pendiente y no se
implementó.

**Problema:** `legacy_identity` confía en datos decodificados de Base64 y un
secreto fijo; no verifica firma, emisor ni audiencia. Evidencia actual:
`api/app/security.py:9-22`; los detalles del error ahora son genéricos.

**Cambio propuesto:** implementar validación JWT real con algoritmo permitido
explícitamente y comprobación de firma, `iss`, `aud` y `exp`. Leer la
configuración de emisor/audiencia y la clave de verificación desde variables de
entorno; no incluir secretos reales en código ni pruebas. Usar mensajes 401
genéricos. Evaluar una dependencia JWT mantenida (por ejemplo, PyJWT) y añadirla
solo si el análisis confirma que hace falta; justificarla en `api/requirements.txt`.
Mantener el esquema `Authorization: Bearer ...` y los endpoints, pero cambiar al
token firmado solo después de coordinar al emisor.

**Archivos a tocar:** `api/app/main.py` (integración), `api/app/security.py`
(validador), `api/requirements.txt` solo si se justifica la dependencia,
`api/tests/test_api.py` y `api/tests/test_security.py` (nuevas pruebas).

**Prueba de caracterización antes de tocar código:** en `test_api.py`, registrar
que un token actualmente aceptado permite acceder a la ruta y que un token
inválido produce 401, sin fijar el detalle interno del error. Después, agregar
pruebas de regresión para JWT válido y rechazo de firma alterada, expiración,
emisor y audiencia incorrectos; usar claves y claims aislados de prueba.

## H-API-02 — Acceso a tareas de otro `owner`

**Aprobación:** aprobada por el usuario (ID de Fibonacci).

**Implementación:** la comparación de propietario está implementada en
`api/app/security.py` y `api/app/services.py`, y las consultas se limitan en
`api/app/repositories.py`. La revisión local determinó que el control no es
efectivo mientras `legacy_identity` acepte tokens falsificables (H-API-01);
H-API-02 vuelve a **Pendiente**.

**Problema:** los parámetros `owner` de lectura y el `owner` del cuerpo de alta
permiten elegir otra identidad sin comprobar autorización. Evidencia actual:
`api/app/security.py:9-22,24-28; api/app/routes.py:38-63`.

**Cambio propuesto:** derivar siempre el propietario de `identity["username"]`.
Conservar el parámetro opcional `owner` por compatibilidad: permitirlo si
coincide con la identidad y responder 403 si solicita otra. En creación, ligar
la tarea al usuario autenticado y rechazar un `owner` explícito que no coincida.
No usar el rol para ampliar acceso sin una política acordada.

**Archivos a tocar:** `api/app/main.py` (o las rutas/servicio y repositorio
resultantes de H-API-06), `api/app/services.py` si se extrae la regla y
`api/tests/test_api.py`.

**Prueba de caracterización antes de tocar código:** fijar la lectura y creación
de tareas del usuario autenticado, sus campos de respuesta y el resumen propio.
Agregar pruebas de regresión para lectura/resumen de otro `owner` y alta con
`owner` ajeno; deben esperar 403 y verificar que no se filtra ni crea información
para otra identidad.

**Revisión local:** las pruebas existentes demuestran 403 para un `owner`
distinto con un token que se considera válido, pero no cubren la falsificación
de la identidad del token. Al resolver H-API-01, agregar una prueba que rechace
un token construido para suplantar otro usuario y conservar las pruebas 403.

## H-API-03 — Filtros e inserts SQL concatenados

**Aprobación:** aprobada por el usuario.

**Implementación:** resuelta en `api/app/repositories.py`; filtros, inserciones
y recuperación de la fila nueva usan parámetros enlazados.

**Problema:** filtros, campos insertados y el ID leído tras insertar se forman
mediante concatenación de texto SQL. Evidencia:
`api/app/main.py:70,84,93` (el ID también se concatena en la línea 87).

**Cambio propuesto:** mover operaciones SQLite a funciones de repositorio y usar
parámetros enlazados en todos los valores. Mantener el orden de tareas, los
valores predeterminados y las formas de respuesta observadas; obtener la fila
creada mediante el ID insertado como parámetro, no como SQL concatenado.

**Archivos a tocar:** `api/app/main.py`, `api/app/repositories.py` (nuevo) y
`api/tests/test_api.py`.

**Prueba de caracterización antes de tocar código:** fijar la lista inicial,
creación normal, resumen, orden y serialización actual. Añadir antes del cambio
una regresión con comillas en los datos de tarea: el valor debe persistir y
devolverse literalmente, sin alterar la consulta ni fallar.

## H-API-04 — Carga insegura de archivos

**Aprobación:** aprobada por el usuario el 2026-11-02.

**Problema:** se usa directamente el nombre aportado por el cliente, se lee el
contenido completo en memoria y no se validan extensión ni tamaño. Evidencia:
`api/app/services.py:78-92`.

**Cambio propuesto:** normalizar el nombre, asegurar que el destino quede dentro
del directorio de cargas, evitar sobrescrituras con un nombre de almacenamiento
seguro y escribir en bloques con límite de bytes. Validar extensión contra una
allowlist y devolver un error HTTP genérico para entradas inválidas. Conservar
la ruta y el formato de respuesta; `fileName`, `storedAt` y `size` deben seguir
presentes. Los valores concretos de extensiones y tamaño quedan pendientes de
acuerdo antes de implementar.

**Archivos a tocar:** `api/app/main.py` (o la ruta resultante de H-API-06),
`api/app/services.py` (servicio de carga, si se extrae), `api/tests/test_api.py`
y, si se crea una prueba dedicada, `api/tests/test_uploads.py`.

**Prueba de caracterización antes de tocar código:** fijar la carga exitosa de
un `.txt` pequeño y los campos/estado de su respuesta, comprobando que el
contenido se guarda. Añadir pruebas de regresión para nombre con traversal,
nombre/extensión no permitidos, tamaño límite y excedido, así como una carga
válida en el límite acordado.

**Estado de ejecución:** la caracterización del comportamiento de carga
existente continúa pasando, pero la corrección está bloqueada hasta acordar
extensiones permitidas y tamaño máximo. No se eligieron valores por cuenta
propia ni se marcó el hallazgo como resuelto.

## H-API-05 — Versiones fijadas pendientes de evaluación SCA

**Aprobación:** aprobada por el usuario.

**Implementación:** resuelta en `api/requirements.txt`: `urllib3==2.8.0` y
`python-multipart==0.0.31`. La evaluación de advisories confirmó que las
versiones anteriores estaban afectadas y que los pins finales no tienen
advisories revisados aplicables.

**Problema:** `api/requirements.txt` fijaba `urllib3==2.5.0` y
`python-multipart==0.0.21`, versiones que se confirmaron afectadas por
advisories revisados. Evidencia de los pins corregidos:
`api/requirements.txt:4-5`.

**Cambio realizado:** el análisis de advisories revisados encontró
`urllib3==2.5.0` afectado por GHSA-2xpw-w6gg-jr37 (CVE-2025-66471),
GHSA-gm62-xv2j-4w53 (CVE-2025-66418) y GHSA-vxq7-64xx-v4gw
(CVE-2026-97689; parche 2.8.0). `python-multipart==0.0.21` estaba afectado por
GHSA-5rvq-cxj2-64vf (CVE-2026-53539; parche 0.0.30); al comprobar ese parche,
se encontró GHSA-v9pg-7xvm-68hf (CVE-2026-53540; parche 0.0.31). Se fijó la
versión 0.0.31. Consultas finales de advisories para `urllib3==2.8.0` y
`python-multipart==0.0.31` devolvieron listas vacías.

La herramienta `appmod-cve-assessment` no admite el ecosistema `pip`; la
comprobación se hizo contra el GitHub Advisory Database oficial. Fuentes:
[urllib3 GHSA-vxq7-64xx-v4gw](https://github.com/advisories/GHSA-vxq7-64xx-v4gw),
[python-multipart GHSA-5rvq-cxj2-64vf](https://github.com/advisories/GHSA-5rvq-cxj2-64vf)
y [python-multipart GHSA-v9pg-7xvm-68hf](https://github.com/advisories/GHSA-v9pg-7xvm-68hf).

**Archivos a tocar:** `api/requirements.txt` solo si el análisis justifica un
cambio; `api/requirements-dev.txt` solo si una herramienta de análisis local
fuera necesaria y se aprueba su inclusión. El informe de SCA se registra como
evidencia en el lugar definido por el paso correspondiente, no en archivos de
otros componentes.

**Prueba de caracterización antes de tocar código:** en `api/tests/test_api.py`,
fijar la respuesta observada de `/api/backend-health` con una respuesta upstream
controlada y la carga multipart `.txt` válida; esto protege los usos de
`urllib3` y `python-multipart` si sus versiones cambian. La comprobación de CVE
es evidencia SCA, no una prueba funcional, y queda pendiente hasta ejecutarla.

## H-API-06 — Responsabilidades concentradas en `main.py`

**Aprobación:** aprobada por el usuario el 2026-11-02.

**Problema:** autenticación, conexión/esquema/semillas SQLite, serialización,
rutas y reglas estaban en un módulo. Evidencia original:
`api/app/main.py:17-29,37-64,67-124`.

**Implementación:** resuelta mediante separación de configuración, rutas,
servicios, seguridad, esquemas, base de datos y repositorio en sus módulos
dedicados.

**Cambio propuesto:** refactor incremental después de caracterizar los contratos.
Dejar `main.py` para creación/configuración de la app y registro de rutas;
separar validación de identidad, esquemas, repositorio SQLite, servicios de
tareas/resumen y carga. Cada función debe tener una responsabilidad; las rutas
delegan sin contener SQL, y los cambios de H-API-01 a H-API-04 se implementan
una sola vez en sus capas respectivas, sin duplicar lógica.

**Archivos a tocar:** `api/app/main.py`; nuevos `api/app/security.py`,
`api/app/schemas.py`, `api/app/repositories.py`, `api/app/services.py` y
`api/app/routes.py` (o submódulos bajo `api/app/routes/` si la separación lo
requiere); `api/tests/test_api.py` y pruebas enfocadas existentes/nuevas.
Conservar `create_app(db_path, upload_dir)` para permitir el aislamiento de
pruebas y configuración observados.

**Prueba de caracterización antes de tocar código:** ampliar `api/tests/test_api.py`
para registrar, con SQLite y uploads temporales, los cinco endpoints, estados
HTTP, campos y valores predeterminados observados, cierre de ciclo de vida y
datos semilla. Ejecutar esa suite antes de mover responsabilidades y repetirla
tras cada extracción.

**Resultado antes del cambio:** la suite de caracterización se ejecutó antes
del refactor; 14 pruebas pasaron y 3 fallaron con los defectos caracterizados
(detalle de error no genérico, detalle interno de `backend-health` expuesto y
tipo inválido aceptado como 201). Los casos de contrato y ciclo de vida
caracterizados pasaron.

**Resultado después del cambio:** suite final con cobertura: 18 pruebas
pasaron; cobertura total 98%, con todos los archivos modificados por encima
del 85%.

## H-API-07 — Tipado genérico, excepciones amplias y lógica anidada

**Aprobación:** aprobada por el usuario el 2026-11-02.

**Problema:** las rutas aceptan `dict[str, Any]`, convierten campos con `str()`,
hay capturas de `Exception` y el resumen tiene condicionales anidados. Evidencia:
`api/app/main.py:17-25,56,68,78,91-104,114-122`.

**Implementación:** resuelta con modelos Pydantic para requests/responses,
serialización con aliases compatibles, detalle genérico de validación y
errores upstream, excepciones acotadas y resumen con condiciones simples.

**Cambio propuesto:** introducir modelos Pydantic de entrada y salida con tipos
acordes a los campos observados; mapear explícitamente respuestas para conservar
los nombres JSON existentes. Validar errores de entrada con respuestas
controladas. Sustituir capturas amplias por excepciones esperadas y mensajes
genéricos; no devolver `str(exception)`. Extraer el conteo del resumen a una
función pequeña o simplificarlo con condiciones combinadas. Usar constantes
nombradas para límites y valores de configuración, sin duplicar validaciones.

**Archivos a tocar:** `api/app/main.py` y los módulos `api/app/schemas.py`,
`api/app/services.py` y `api/app/routes.py` creados en H-API-06;
`api/tests/test_api.py` y pruebas de esquemas/servicios en `api/tests/` si son
necesarias.

**Prueba de caracterización antes de tocar código:** fijar los campos JSON y
valores predeterminados del alta, la serialización de tareas y el resumen, más
los estados/campos de error que sean parte del contrato observado. No fijar
mensajes que expongan excepciones internas. Añadir pruebas de regresión para
payload inválido, valores de tipos incorrectos y errores genéricos sin detalles
internos.

**Resultado antes del cambio:** la caracterización observó tres fallas
esperadas: errores de token no genéricos, detalle upstream interno expuesto y
valor de tipo inválido aceptado como alta exitosa.

**Resultado después del cambio:** esos casos ahora verifican errores genéricos
y rechazo de tipos inválidos; la suite final pasó (18 pruebas) y la cobertura
de `schemas.py`, `routes.py`, `services.py` y `main.py` fue completa.

## Secuencia de ejecución propuesta

1. Añadir y ejecutar las pruebas de caracterización de los siete apartados antes
   de cambiar código; registrar comandos y resultados reales en `docs/TESTING.md`
   cuando ese entregable corresponda.
2. Obtener evidencia SCA y acordar con el responsable la emisión JWT, sus claims
   y la política de extensiones/tamaño. No desplegar un cambio de autenticación
   incompatible ni elegir límites de carga sin esa coordinación.
3. Implementar por capas: modelos y autenticación, autorización y repositorio
   SQL, carga segura, y extracción incremental de responsabilidades.
4. Ejecutar las pruebas focalizadas desde `api/`, después la suite/gate
   documentado, revisar cobertura del código modificado frente a la meta de 85%
   y actualizar `HALLAZGOS.md` solo con resultados observados.

## Registro de ejecución — componente api

| Fecha | IDs | Ejecución | Resultado |
|---|---|---|---|
| 2026-11-02 | H-API-02, H-API-03, H-API-05 | `python -m pytest -q` invocado desde la raíz por error | Falló durante colección (`ModuleNotFoundError: app`); no es un resultado de pruebas del componente. Se corrigió el cwd en las ejecuciones siguientes. |
| 2026-11-02 | H-API-01, H-API-02, H-API-03, H-API-05 | Baseline: `python -m pytest -q`, cwd `api/` | 4 pruebas pasaron antes de añadir caracterización; incluyeron token legacy válido e inválido y respuestas actuales. |
| 2026-11-02 | H-API-02, H-API-03, H-API-05 | Caracterización previa: `python -m pytest -q`, cwd `api/` | 5 pasaron y 4 fallaron como se esperaba: las tres de acceso ajeno recibieron 200/201 en vez de 403; la inserción con apóstrofos produjo error SQL. La prueba de contrato de `backend-health` pasó. |
| 2026-11-02 | H-API-02, H-API-03, H-API-05 | `python -m pip install -r requirements.txt`, cwd `api/`, con `api/.venv` | Instalación correcta de `urllib3==2.8.0` y `python-multipart==0.0.31`. |
| 2026-11-02 | H-API-02, H-API-03, H-API-05 | `python -m pytest --cov=app.main --cov=app.repositories --cov-report=term-missing`, cwd `api/` y `.venv` | 10 pasaron. Cobertura: `app/main.py` 95%, `app/repositories.py` 86%, total 94%; archivos modificados por encima de 85%. Persisten avisos deprecados de `on_event`/Starlette. |
| 2026-11-02 | H-API-05 | `python -m pip check`, cwd `api/` y `.venv`; consultas finales de advisories revisados | Sin dependencias rotas; GitHub Advisory Database devolvió `[]` para `urllib3==2.8.0` y `python-multipart==0.0.31`. |
| Sesión actual (fecha no registrada) | H-API-06, H-API-07 | Suite de caracterización previa al refactor, cwd `api/` | 14 pasaron; 3 fallaron como esperado en los casos de errores genéricos y tipo inválido. |
| Sesión actual (fecha no registrada) | H-API-06, H-API-07 | `pytest -q`, cwd `api/` | 17 pasaron después del refactor inicial. |
| Sesión actual (fecha no registrada) | H-API-06, H-API-07 | Primera ejecución `pytest --cov=app --cov-report=term-missing`, cwd `api/` | 17 pasaron, pero `database.py` quedó en 79%; se añadió prueba específica para cierre ante fallo de inicialización. |
| Sesión actual (fecha no registrada) | H-API-06, H-API-07 | `pytest --cov=app --cov-report=term-missing`, cwd `api/` | 18 pasaron; cobertura total 98%. `repositories.py` y `security.py` 92%; los demás módulos modificados con cobertura completa; todos sobre el umbral 85%. |
| Sesión actual (fecha no registrada) | H-API-06, H-API-07 | `.\.venv\Scripts\python.exe -m pytest --cov=app --cov-report=term-missing`, cwd `api/` | 18 pasaron; cobertura total 98%; `repositories.py` y `security.py` 92%, resto de módulos con cobertura completa. Un aviso de deprecación de Starlette. |
| Sesión actual (fecha no registrada) | H-API-06, H-API-07 | `git diff --check`, cwd raíz del repositorio | Sin errores de whitespace. |
| 2026-11-02 | H-API-01, H-API-02, H-API-03, H-API-04, H-API-05, H-API-06, H-API-07 | Revisión de seguridad local de `git diff main -- api/`, documentos API y archivos nuevos/status | H-API-03/05/06/07 verificados con la evidencia registrada; H-API-01 y H-API-04 siguen pendientes; H-API-02 vuelve a Pendiente porque una identidad falsificable permite eludir la regla de propietario. No se repitió SCA ni se ejecutaron pruebas. La rama observada fue `main`, no `day1/prompting`; no se cambió de rama. |
| 2026-11-02 | H-API-04 | Revisión acotada de carga y límite de tamaño | `routes.py:65-75` no impone tamaño y `services.py:83-86` lee el archivo completo; las pruebas cubren solo una carga pequeña (`test_api.py:106-122`). |

H-API-01 no se implementó porque falta acordar `iss`, `aud` y el claim de
identidad con el emisor JWT fuera del ámbito `api/`. H-API-02 vuelve a
Pendiente: su protección por identidad es eludible mientras H-API-01 no se
resuelva. H-API-04 permanece sin corrección hasta acordar allowlist de
extensiones y tamaño máximo. H-API-06 y H-API-07 se implementaron según el plan
aprobado; no se modificaron otros hallazgos.
