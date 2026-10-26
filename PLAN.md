# Plan de corrección

## Alcance y selección actual

Este plan selecciona únicamente **H-WEB-02**, el único hallazgo del componente
web que continúa marcado `Pendiente` en `HALLAZGOS.md`. Las secciones de
H-WEB-01 y H-WEB-03 a H-WEB-07 se conservan como registro histórico de la
implementación aprobada y completada; no forman parte del alcance de este
replan.

## Aprobación humana registrada para la implementación anterior

- **Aprobador indicado:** Joel Lopez.
- **Alcance aprobado en ese momento:** implementar H-WEB-01 a H-WEB-07
  conforme al plan de implementación anterior. Este registro no aprueba cambios
  adicionales al backend ni amplía el alcance actual de H-WEB-02.
- **Fecha de registro:** 2026-10-26.

El límite de implementación sigue siendo `web/`. `docs/ENDPOINTS.md` existe y
describe el contrato observado por el consumidor frontend, no un contrato
confirmado mediante servicios reales. Para este item se preservarán
`GET /api/tasks?owner=...` y el header Authorization actualmente observado,
excepto si una decisión coordinada y documentada de contrato indica lo
contrario. La autorización del servidor no se puede corregir ni verificar
desde `web/`; esa dependencia debe
resolverse con el responsable del backend antes de afirmar que H-WEB-02 está
corregido. No se registra una aprobación nueva para ampliar el alcance.

### Decisión de alcance registrada

- **Decisión del usuario (2026-10-26):** excluir cambios de backend y
  continuar. Ante las opciones de alcance frontend, se eligió
  `document_only`: no modificar código ni pruebas y dejar constancia de que
  H-WEB-02 no se puede resolver ni verificar solo con evidencia frontend.
- **Resultado:** H-WEB-02 permanece `Pendiente`. Se conserva
  `GET /api/tasks?owner=...` y la cabecera observada; no se declara corregida
  la autorización y no se considera que la aprobación histórica de
  H-WEB-01 a H-WEB-07 autorice un cambio de contrato.
- **Validación:** no se ejecutaron pruebas ni llamadas a servicios para esta
  decisión documental. La caracterización mock existente comprueba la forma
  del request, no que el backend aplique autorización por identidad.

El proyecto usa Vitest en entorno Node (`web/vitest.config.ts`). Si se retoma
una modificación frontend tras acordar un cambio de contrato, la
caracterización de H-WEB-02 debe escribirse y ejecutarse antes de modificar
código de producción. La verificación de autorización real seguirá requiriendo
evidencia backend autorizada y no puede sustituirse por un resultado mock.

## Plan previo de implementación (registro histórico)

Las secciones siguientes, salvo la sección independiente `Item: H-WEB-02`,
documentan el plan histórico aprobado para los items que ya se implementaron.
Sus etiquetas `Pendiente` describen el estado al redactarse el plan original,
no el estado actual de `HALLAZGOS.md`.

### H-WEB-01 — Token de sesión en localStorage

- **Hallazgo:** token guardado en `localStorage` (estado Pendiente en
  `HALLAZGOS.md`).
- **Problema:** cualquier script ejecutado en el origen puede leer el token.
  Esta exposición estática está confirmada; no se reprodujo robo de token.
- **Cambio propuesto:** encapsular lectura, escritura y eliminación de sesión
  en un servicio de sesión, evitando accesos directos desde componentes. Como
  alternativa acotada dentro de `web/`, evaluar `sessionStorage`, que reduce
  la persistencia al ciclo de la pestaña pero **no** protege contra scripts
  ejecutados en el origen. El cambio de persistencia requiere aprobación
  explícita porque puede alterar el comportamiento al cerrar y reabrir el
  navegador. La mitigación más sólida con cookie `HttpOnly`, `Secure` y
  `SameSite` depende de soporte del backend y queda fuera de este alcance.
- **Archivos previstos:** `web/src/app/login/login.component.ts`,
  `web/src/app/dashboard/dashboard.component.ts`; nuevo servicio de sesión
  bajo `web/src/app/`; pruebas correspondientes bajo `web/src/app/`.
- **Caracterización previa:** cubrir login válido (token y usuario guardados,
  preferencias preservadas y navegación a `/dashboard`), recarga/lectura de
  sesión al entrar a Dashboard, redirección sin token y logout (borrado de
  token/usuario y navegación a `/login`). Registrar el comportamiento de
  persistencia actual antes de decidir entre almacenamiento actual y
  `sessionStorage`.

## Item: H-WEB-02 — `owner` de tareas controlado por el cliente

- **Hallazgo de HALLAZGOS.md:** el dashboard deriva `owner` del usuario
  almacenado en el navegador y lo manda en la query. La entrada es controlable
  por el cliente; no está comprobado si el backend liga ese filtro a la
  identidad del token.
- **Problema y límite de corrección:** codificar el query evita alterar su
  estructura, pero no autoriza el valor. Ningún cambio solo en el frontend
  puede impedir que el cliente construya otra petición. No se debe declarar
  resuelto el riesgo de autorización basándose en una prueba mockeada.
- **Cambio propuesto:** mantener el request observado de
  `GET /api/tasks?owner=...` y su esquema de autenticación observado; no
  cambiar el contrato desde `web/` sin acuerdo. La corrección de seguridad
  requiere que el servicio backend
  verifique que `owner` corresponde a la identidad autenticada, o que se
  acuerde otro contrato. Esa implementación y su prueba de autorización son
  dependencia externa y quedan fuera de este plan web; hasta tener evidencia,
  H-WEB-02 permanece `Pendiente`. Tras la decisión del backend, actualizar
  únicamente el consumidor web y su documentación si el contrato acordado
  exige modificar la query.
- **Archivos web previstos:** `web/src/app/tasks.service.ts` y
  `web/src/app/dashboard/dashboard.component.ts` solo si el contrato acordado
  requiere un cambio frontend; `web/src/app/services.spec.ts` para
  caracterización/regresión. `docs/ENDPOINTS.md` se actualizaría únicamente si
  cambia el contrato acordado, conservando explícitamente la distinción con lo
  observado. No se prevén cambios a otros componentes ni a archivos backend.
- **Prueba de caracterización antes de tocar producción:** con token y usuario
  ficticios, comprobar que el servicio solicita el endpoint observado,
  codifica el valor `owner` y adjunta la cabecera Bearer. Añadir una prueba
  local que cambie el username almacenado y demuestre qué valor de query
  produciría el cliente; esto caracteriza la fuente controlable, pero no
  pretende probar acceso cruzado ni autorización real. Reusar Vitest y las
  pruebas existentes en `web/src/app/services.spec.ts`; no añadir dependencia.
- **Prueba posterior condicionada:** si, tras coordinación, cambia el contrato
  frontend, agregar primero una caracterización del nuevo request y después
  la prueba de regresión para ese contrato. La prueba que confirma autorización
  por identidad debe ejecutarse en el componente backend con un entorno real o
  de integración autorizado; queda pendiente y fuera de alcance aquí.

## Plan histórico complementario

Las siguientes secciones son registros del plan original para items que ya
figuran resueltos en `HALLAZGOS.md`; no son parte del alcance actual de H-WEB-02.

### H-WEB-03 — Responsabilidades acopladas en los componentes

- **Hallazgo:** Login y Dashboard combinan llamadas HTTP, sesión, lógica de
  presentación y navegación (estado Pendiente).
- **Problema:** cambios en persistencia o transporte afectan directamente el
  flujo de pantalla y dificultan aislar regresiones.
- **Cambio propuesto:** extraer la autenticación HTTP a `AuthService`, la
  lectura y escritura de sesión a un servicio de sesión, y la consulta de
  tareas a `TasksService`. Dejar en cada componente el estado de pantalla y la
  navegación que le corresponde. Centralizar las URLs/configuración y claves
  de almacenamiento en servicios/configuración de `web/`, sin strings
  duplicados ni valores mágicos. Mantener los endpoints y los datos
  observados.
- **Archivos previstos:** `web/src/app/login/login.component.ts`,
  `web/src/app/dashboard/dashboard.component.ts`, posibles plantillas
  afectadas, servicios/configuración nuevos bajo `web/src/app/` y nuevas
  pruebas unitarias bajo `web/src/app/`.
- **Caracterización previa:** cubrir los flujos actuales de éxito y error del
  login, respuesta sin token, estado busy, navegación, preferencias, carga de
  tareas, ausencia de token, filtrado de `ARCHIVED`, orden/prioridad, error de
  consulta y logout. Inyectar/mocar HTTP, almacenamiento y navegación para
  verificar sus interacciones sin servicios externos.

### H-WEB-04 — Mensaje dinámico mediante `[innerHTML]`

- **Hallazgo:** el template representa el mensaje del login con `[innerHTML]`
  (estado Pendiente).
- **Problema:** el texto incluye valores de usuario y errores recibidos. El
  binding estándar de Angular aplica sanitización, por lo que no se confirmó
  ejecución de HTML arbitrario; aun así, la presentación depende de HTML
  dinámico sin necesidad funcional.
- **Cambio propuesto:** representar el mensaje como texto interpolado y usar
  marcado HTML estático para estilos y saltos de línea. No usar
  `DomSanitizer` para confiar en valores dinámicos. Mantener mensajes
  equivalentes y su presentación legible.
- **Archivos previstos:** `web/src/app/login/login.component.ts`,
  `web/src/app/login/login.component.html`, potencialmente
  `web/src/app/login/login.component.css`, y pruebas del login.
- **Caracterización previa:** cubrir el texto y formato observados para
  usuario vacío, contraseña vacía, respuesta sin token y error de backend,
  incluidos valores ficticios con caracteres `<`, `>` y `&`. La prueba deberá
  distinguir texto visible de HTML ejecutable; no usar payloads contra
  servicios.

### H-WEB-05 — Tipado `any` y validación anidada

- **Hallazgo:** los componentes y `formatTaskLabel` usan `any`; las
  validaciones de login están anidadas (estado Pendiente).
- **Problema:** se debilita la comprobación estática de las respuestas y los
  estados; el anidamiento hace más difícil confirmar que cada rama conserva
  su mensaje y limpieza de busy.
- **Cambio propuesto:** definir tipos de request/response para login y tareas,
  un tipo de usuario/sesión y un tipo de tarea; reemplazar `any` por tipos
  explícitos y errores como `unknown` con extracción controlada de mensajes.
  Extraer validaciones simples a retornos anticipados y mantener una sola
  responsabilidad por método. Eliminar duplicación solo donde las pruebas
  confirmen comportamiento repetido.
- **Archivos previstos:** `web/src/app/login/login.component.ts`,
  `web/src/app/dashboard/dashboard.component.ts`,
  `web/src/app/utils/legacy-format.ts`, tipos nuevos bajo
  `web/src/app/` si son necesarios y pruebas unitarias relacionadas.
- **Caracterización previa:** antes del tipado/refactor, cubrir formateo de
  etiquetas con valores normales y ausentes, todos los estados de validación
  del login, formato de errores y campos de tareas que la UI usa. Después
  verificar compilación TypeScript y los mismos resultados, sin cambiar
  endpoint ni forma observada de respuesta.

### H-WEB-06 — Dependencias pendientes de revisar

- **Hallazgo:** `web/package.json` declara `axios` 0.31.0 y `lodash` 4.17.21;
  no se comprobó que tengan un advisory aplicable (estado Pendiente).
- **Problema:** sin análisis de advisories y uso real no se puede determinar
  si hay riesgo ni si una actualización o eliminación es segura.
- **Cambio propuesto:** ejecutar la auditoría configurada
  (`npm run audit:workshop`) y revisar advisories aplicables, versiones transitivas y
  uso en código de `axios` y `lodash`. Si se justifica un cambio, limitarlo a
  la dependencia afectada, mantener el lockfile consistente y no bajar gates.
  No actualizar ni eliminar paquetes basándose solo en los números de versión
  sembrados en `RETO.md`.
- **Archivos previstos:** inicialmente ninguno hasta obtener evidencia; si se
  aprueba una corrección sustentada, solo `web/package.json`,
  `web/package-lock.json` y los imports/usos directamente afectados bajo
  `web/src/`.
- **Caracterización previa:** ejecutar `npm test` y `npm run build` desde
  `web/` y registrar resultados reales antes de tocar manifiestos; contrastar
  luego con las mismas pruebas/build. La auditoría es análisis de
  dependencias, no sustituye las pruebas funcionales.

### H-WEB-07 — Cobertura de pruebas limitada a una utilidad

- **Hallazgo:** la prueba existente cubre `formatTaskLabel`; no hay pruebas
  visibles del flujo de login, sesión, tareas o logout (estado Pendiente).
- **Problema:** errores de navegación, persistencia, requests y estados de UI
  pueden introducirse sin que la suite actual los detecte.
- **Cambio propuesto:** ampliar incrementalmente las pruebas con los casos de
  caracterización descritos en H-WEB-01 a H-WEB-05, y conservar la prueba de
  utilidad. Reusar Vitest y el entorno Node existentes; no añadir dependencias
  salvo que un caso crítico no pueda comprobarse de otra forma y se justifique
  por separado. Medir cobertura del código modificado y aspirar al 85% o más,
  sin reducir gates.
- **Archivos previstos:** pruebas nuevas `*.spec.ts` bajo `web/src/app/` junto
  a los componentes/servicios y, si se necesita, cambios mínimos en
  `web/vitest.config.ts`. Código de producción solo en los archivos
  directamente cubiertos y según los hallazgos seleccionados.
- **Caracterización previa:** conservar y ejecutar primero
  `npm test` desde `web/`; añadir pruebas de comportamiento antes de modificar
  cada superficie. Luego ejecutar `npm test`, `npm run test:coverage` y
  `npm run build` desde `web/`. Los resultados y la cobertura deberán
  registrarse cuando se ejecuten; aquí no se afirma que se hayan ejecutado.

## Riesgos y dependencias pendientes

- `docs/ENDPOINTS.md` registra los contratos observados por web y las preguntas
  abiertas; no confirma respuestas de servicios activos ni la autorización.
- La autorización del parámetro `owner` no puede corregirse ni comprobarse
  desde el alcance web. Requiere coordinación separada con el componente del
  servidor, preservando el contrato hasta que exista acuerdo documentado.
- El cambio de `localStorage` a `sessionStorage` quedó aprobado y se
  implementó: limita la persistencia al ciclo de la pestaña, pero no elimina
  el acceso de JavaScript del origen al token. No se trasladó ningún secreto
  desde el servidor al frontend; el token ya era consumido por el frontend.
  Una cookie `HttpOnly` requiere soporte del backend y queda pendiente.
- No se ejecutaron pruebas, build ni auditoría de dependencias al crear este
  plan. Las ejecuciones posteriores y cualquier aprobación se registran aquí.

## Ejecuciones registradas — componente web

| Fecha | IDs | Comando (cwd `web/`, salvo indicación) | Resultado |
|---|---|---|---|
| 2026-10-26 | H-WEB-01, H-WEB-03, H-WEB-04, H-WEB-05, H-WEB-07 | `npm test` | Caracterización previa: 2 archivos, 11 pruebas aprobadas. |
| 2026-10-26 | H-WEB-01, H-WEB-02, H-WEB-03, H-WEB-04, H-WEB-05, H-WEB-06, H-WEB-07 | `npm run build` | Aprobado. Avisos de optimización CommonJS para axios y lodash. |
| 2026-10-26 | H-WEB-01, H-WEB-03, H-WEB-04, H-WEB-05, H-WEB-07 | `npm run test:coverage` | 11 pruebas aprobadas. Cobertura global de referencia: 80.48% líneas; login 96.66%, dashboard 97.05%, utilidad 100%. No es la cobertura final del diff. |
| 2026-10-26 | H-WEB-06 | `npm audit --audit-level=moderate` | Falló el umbral: 25 advisories (10 moderados, 9 altos, 6 críticos), incluidos avisos altos para axios 0.31.0 y lodash 4.17.21, además de dependencias transitivas. Sin cambios de manifiesto por esta auditoría. |
| 2026-10-26 | H-WEB-01 a H-WEB-07 | `npm test` desde la raíz del repositorio | Falló por cwd incorrecto (`ENOENT`, no hay `package.json` en la raíz); no cuenta como prueba de web. La repetición desde `web/` sí pasó según la primera fila. |
| 2026-10-26 | H-WEB-01 a H-WEB-07 | `npm test` (primera ejecución tras añadir caracterización) | Falló al cargar los componentes: el entorno Node no había cargado el compilador JIT de Angular. Se añadió el import de compilador disponible, sin nueva dependencia. |
| 2026-10-26 | H-WEB-01 a H-WEB-07 | `npm test` (segunda ejecución de caracterización) | 10/11 pruebas pasaron; una expectativa de orden de prioridades no coincidía con el comportamiento actual. Se corrigió la expectativa para caracterizar el orden observado. |
| 2026-10-26 | H-WEB-01, H-WEB-03, H-WEB-04, H-WEB-05, H-WEB-07 | `npm test` | Tras la primera refactorización: 3 archivos, 19 pruebas aprobadas. |
| 2026-10-26 | H-WEB-06 | `npm uninstall axios lodash @types/lodash` | Falló en npm/Arborist (`Cannot read properties of null (reading 'children')`); no cambió manifiesto ni lockfile. |
| 2026-10-26 | H-WEB-06 | `npm install --package-lock-only --ignore-scripts --legacy-peer-deps` | Aprobado; sincronizó el lockfile con las dependencias retiradas. npm informó 19 vulnerabilidades en ese paso; la auditoría final posterior informó 23. |
| 2026-10-26 | H-WEB-01, H-WEB-03, H-WEB-04, H-WEB-05, H-WEB-07 | `npm run test:coverage` | 20 pruebas aprobadas; 91.76% líneas globales. Ejecución intermedia antes de completar las pruebas del helper. |
| 2026-10-26 | H-WEB-06 | `npm audit --json` | Falló el audit: 23 avisos (10 moderados, 7 altos, 6 críticos). No aparecen axios ni lodash; permanecen advisories en Angular, Vitest, Vite y dependencias transitivas. |
| 2026-10-26 | H-WEB-01 a H-WEB-07 | `npm run test:coverage` | Final: 4 archivos, 25 pruebas aprobadas; 92.9% líneas globales. Los archivos ejecutables modificados (`main.ts`, servicios, componentes, utilidades y configuración de endpoints) alcanzaron 100% de líneas; los archivos de tipos no contienen instrucciones ejecutables. |
| 2026-10-26 | H-WEB-01 a H-WEB-07 | `npm run build` | Final: aprobado, bundle Angular generado sin advertencias CommonJS de axios/lodash. |
| 2026-10-26 | H-WEB-01 a H-WEB-07 | `git diff --check` | Aprobado; sin errores de whitespace detectados. |
