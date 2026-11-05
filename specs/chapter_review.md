# `chapter_review.md`

VEREDICTO: RECHAZADO

## Resumen

La entrega no demuestra que H-AUTH-05 esté implementada ni que sus controles hayan sido probados. El material identifica una discrepancia de alcance: el brief trata de restringir CORS de autenticación y revisar dependencias, mientras que la historia inicial desarrolla una transferencia entre cuentas propias y marca sus criterios como propuestas pendientes de aprobación.

No se proporcionaron el repositorio, la configuración del servidor, los manifiestos o lockfiles, ni resultados de pruebas ejecutadas. El fragmento Angular incluido valida una URL base del cliente; no configura ni verifica CORS en el servidor. El informe de seguridad también mantiene bloqueada la aprobación de liberación.

Este veredicto es una evaluación técnica de la evidencia recibida. No concede, sustituye ni presume aprobaciones humanas de producto, arquitectura, seguridad o gestión de dependencias.

## Alcance y base de la revisión

Se revisó únicamente el contenido suministrado en el historial: `user_story.md`, `backend_spec.md`, `frontend_spec.md`, `testing_report.md`, el informe de seguridad y el fragmento `auth-api-config.service.ts`. Esos nombres se toman de los artefactos descritos; no se recibió un checkout para verificar su existencia, versión o integridad.

El brief no proporciona criterios de aceptación formales para H-AUTH-05. Por ello, la tabla siguiente distingue los objetivos inferibles del título y de los planes de prueba de cualquier criterio formalmente aprobado. No se considera que un plan o una propuesta prueben implementación o cumplimiento.

## Evidencia por criterio

| Criterio u objetivo identificado | Arquitectura y contrato | Persistencia y modelo de datos | Implementación | Pruebas | Seguridad y conclusión |
|---|---|---|---|---|---|
| **H05-01 — Política CORS de auth definida y restringida.** Objetivo inferido; no es un criterio formal aprobado. | `user_story.md` indica que no se definieron orígenes, rutas, métodos, cabeceras ni política de credenciales. `testing_report.md` propone casos, pero no una política aprobada. | No se recibió un diseño o contrato de persistencia. No hay evidencia de cambios ni de ausencia de cambios en la base de datos. | `backend_spec.md` declara que no se implementó código. No se recibió configuración ni código del servidor de autenticación. | `testing_report.md` marca los casos CORS como **NO EJECUTADO**. | No se puede verificar el comportamiento de orígenes permitidos y no permitidos ni descartar una política demasiado permisiva. CORS no sustituye autenticación ni autorización. **No acreditado.** |
| **H05-02 — Métodos, cabeceras, rutas y preflight sujetos a la política aprobada.** Objetivo inferido; contrato pendiente. | Faltan rutas de auth, métodos y cabeceras permitidos, y resultado HTTP esperado para preflight. | No hay contrato de persistencia ni medición que permita confirmar que `OPTIONS` no genera escrituras de negocio. | No se recibió implementación del servidor. | Los casos de método, cabecera y preflight del informe de pruebas son planes, no resultados. | No es posible certificar la configuración efectiva ni el comportamiento de preflight. **No acreditado.** |
| **H05-03 — Credenciales configuradas según política; nunca `*` junto con credenciales.** Objetivo inferido y regla de seguridad recogida en los informes. | La política de credenciales está pendiente de definición. | Sin evidencia disponible; no se identifica un requisito de datos para este control. | No hay configuración del servidor para inspeccionar. | El caso de credenciales está propuesto, pero **NO EJECUTADO**. | No se puede confirmar si se permiten credenciales ni verificar el encabezado efectivo. La regla de no usar `*` con credenciales debe mantenerse en la política aprobada. **No acreditado.** |
| **H05-04 — Dependencias de autenticación inventariadas y revisadas.** Objetivo inferido; no se identificaron paquetes ni política de actualización. | `backend_spec.md` y `testing_report.md` señalan que faltan manifiestos, lockfiles y decisiones sobre dependencias concretas. | No se aportaron artefactos que permitan identificar dependencias de persistencia relacionadas con auth. | No se aportaron manifiestos, lockfiles, inventario ni cambios de dependencias. | Los comandos sugeridos son condicionales y no se ejecutaron. No hay salida de auditoría. | No puede evaluarse exposición a vulnerabilidades conocidas ni verificarse una remediación o riesgo residual. **No acreditado.** |
| **H05-05 — URL base del cliente configurada explícitamente.** Comprobación limitada al fragmento Angular; no equivale a probar CORS. | `frontend_spec.md` aclara que la configuración del cliente no define la política CORS del servidor. | No aplica según la evidencia recibida. | `AuthApiConfigService` usa `normalizeAuthApiBaseUrl`, que rechaza URLs vacías, relativas, con comodines, credenciales, query o fragmento. El código acepta tanto `https:` como `http:`. No se proporcionó una aplicación Angular para comprobar su integración. | `testing_report.md` define casos de configuración, pero no se ejecutaron pruebas unitarias. | El fragmento no demuestra seguridad del servidor. Tampoco distingue producción de desarrollo para exigir HTTPS: debe aclararse la política de transporte y comprobarse que una configuración de producción no permita HTTP si el requisito es HTTPS. **Comprobación parcial; integración y política no acreditadas.** |
| **H05-06 — No introducir cambios de persistencia fuera del alcance y no ejecutar operaciones de negocio durante el preflight.** Comprobación de regresión propuesta; no consta como criterio formal. | El alcance de H-AUTH-05 no define cambios de datos. | No se recibieron esquema, migraciones, contratos ni evidencia de ejecución que permita inspeccionar escrituras. | No se recibió un diff del repositorio. | El informe propone verificar que `OPTIONS` no ejecute operaciones de negocio, pero la comprobación no se realizó. | No se puede afirmar que no existan cambios de persistencia ni que el preflight sea inocuo en la implementación real. **Pendiente de verificación.** |

### Criterios de transferencia incluidos en el historial

Los criterios siguientes aparecen en `user_story.md` como **propuestas de transferencia**, no como criterios aprobados de H-AUTH-05. No se deben usar para ampliar el alcance de esta entrega sin confirmación humana.

| Criterio propuesto de transferencia | Evidencia y estado |
|---|---|
| Propiedad de ambas cuentas por el cliente autenticado. | Sin implementación ni pruebas. El contrato de transferencia no está aprobado. |
| Cuentas distintas y activas; rechazo sin modificar saldos. | Sin implementación ni pruebas. |
| Fondos suficientes y moneda soportada. | Sin implementación ni pruebas. |
| Límites aplicables. | La definición de límites está pendiente. |
| Atomicidad de débito, crédito y persistencia. | No se recibió contrato de persistencia, implementación transaccional ni prueba de integración. |
| Idempotencia por `Idempotency-Key`, incluida la reutilización con contenido distinto. | No se recibió implementación ni decisiones de formato o retención de la clave. |
| Monto recibido como string decimal, nunca como número de punto flotante. | No se recibió endpoint ni validación implementada. |
| CORS de autenticación restringido a orígenes explícitos. | Es coherente con el título de H-AUTH-05, pero la política y el comportamiento siguen sin definirse ni probarse. |
| Revisión y documentación de dependencias de auth. | Es coherente con el título de H-AUTH-05, pero no hay manifiestos, resultados o acciones documentadas. |

La propuesta también menciona una ruta, formatos de solicitud y respuesta, códigos de error y decisiones de seguridad. Al estar marcados como pendientes de aprobación, no son un contrato implementado ni una base suficiente para certificar transferencia.

## Hallazgos y correcciones requeridas

| ID | Hallazgo y evidencia | Impacto | Responsable o área | Cambio requerido | Cómo verificar la corrección |
|---|---|---|---|---|---|
| **H-01** | **Alcance y criterios sin alinear.** `user_story.md` combina el brief de CORS/dependencias con una historia de transferencia y califica los criterios de transferencia como propuestas. | No hay una base aprobada para determinar qué debe cumplir la entrega; existe riesgo de aceptar o liberar una solución para un alcance distinto. | Responsable individual desconocido. Producto y arquitectura deberían confirmar el alcance; las aprobaciones correspondientes deben conservarse en sus procesos humanos. | Confirmar si H-AUTH-05 cubre exclusivamente CORS y dependencias, o si la transferencia es una feature separada. Documentar criterios de aceptación formales para el alcance aprobado. | Revisar la especificación aprobada y confirmar que requisitos, implementación y pruebas corresponden al mismo alcance. |
| **H-02** | **Política y configuración CORS del servidor no aportadas.** `backend_spec.md` declara que no se implementó código; no se recibió configuración del servidor. | No es posible demostrar que los orígenes no autorizados sean rechazados ni que la política no sea excesivamente amplia. | Responsable individual desconocido; equipo del servicio de autenticación/backend o plataforma, según la propiedad real del servidor. | Aprobar por entorno los orígenes, rutas, métodos, cabeceras, preflight y credenciales; implementar la política en el servidor, con orígenes explícitos cuando corresponda. | Inspeccionar la configuración efectiva y ejecutar pruebas de preflight desde orígenes permitidos, no permitidos y limítrofes, además de métodos y cabeceras no permitidos y la política de credenciales. Conservar resultados reproducibles. |
| **H-03** | **Revisión de dependencias sin evidencia.** No se recibieron manifiestos, lockfiles, inventario, resultados de análisis ni registro de acciones. | No puede evaluarse la exposición a vulnerabilidades ni confirmarse que las dependencias relevantes para auth se hayan revisado. | Responsable individual desconocido; mantenedores de dependencias del servicio y área de AppSec, según la organización. | Aportar los manifiestos y lockfiles reales; identificar dependencias directas y transitivas usadas por auth; registrar versiones, resultados, acciones acordadas y riesgos residuales. | Repetir la revisión con las herramientas aprobadas para los archivos reales y verificar que cada hallazgo tenga una resolución o excepción formal vigente. |
| **H-04** | **Pruebas de CORS y dependencias no ejecutadas.** `testing_report.md` declara “NO EJECUTADO”; el informe de seguridad confirma que no se aportaron resultados. | No hay evidencia de comportamiento efectivo ni base de certificación técnica. | Responsable individual desconocido; QA/ingeniería de pruebas y equipos de servicio correspondientes. | Ejecutar las pruebas aprobadas en un entorno representativo y conservar configuración y resultados. | Revisar resultados reproducibles para casos permitidos, rechazados, limítrofes, preflight y credenciales, y evidencias de la revisión de dependencias. |
| **H-05** | **Persistencia y posible efecto de preflight sin verificar.** No se recibieron esquema, migraciones, código ni mediciones de escrituras. | Podrían pasar inadvertidos cambios fuera de alcance o efectos de negocio asociados a solicitudes `OPTIONS`; no hay evidencia para confirmar que hayan ocurrido. | Responsable individual desconocido; equipo propietario del servicio y de persistencia. | Aportar el diff y los artefactos de persistencia del cambio, o evidencia de que no hay modificaciones. Verificar que preflight no active operaciones de negocio. | Revisar cambios de esquema y migraciones; observar en un entorno de prueba que las solicitudes de preflight no producen escrituras ni efectos de negocio. |
| **H-06** | **El cliente acepta HTTP sin distinguir entornos.** En `normalizeAuthApiBaseUrl`, la validación admite `http:` y `https:`. No se recibió una política que determine si HTTP es válido en producción. | Si la configuración de producción puede usar HTTP, el tráfico de autenticación podría no cumplir el nivel de protección de transporte requerido. Es una brecha por aclarar, no evidencia de que producción use HTTP. | Responsable individual desconocido; propietario del cliente y del despliegue. | Definir la política por entorno y, si producción exige HTTPS, validarla en el punto de configuración correspondiente. | Añadir pruebas que demuestren el rechazo de HTTP en producción y aceptación solo donde esté explícitamente permitido; verificar la configuración desplegada. |

## Pruebas ejecutadas y pendientes

### Ejecutadas

- **Pruebas de software, integración, seguridad o dependencias: ninguna.**
- Se realizó una revisión documental del historial suministrado, sin acceso al repositorio ni ejecución de comandos. Esa revisión no constituye una prueba de la implementación.

### Pendientes

- Pruebas de CORS desde orígenes permitidos, no permitidos y limítrofes.
- Pruebas de preflight con métodos y cabeceras permitidos y no permitidos.
- Verificación de la política de credenciales y de que no se combine `*` con credenciales.
- Prueba en entorno representativo y comprobación de que el preflight no genere operaciones de negocio o escrituras.
- Inventario y auditoría de dependencias de autenticación a partir de manifiestos y lockfiles reales; revisión de hallazgos y acciones.
- Pruebas de la configuración Angular y verificación de la política HTTP/HTTPS por entorno.
- Inspección del diff, migraciones y artefactos de persistencia cuando se disponga del repositorio.

Siguen pendientes porque no se proporcionaron el repositorio, los manifiestos, la política aprobada, la configuración del servidor ni un entorno de prueba. Los comandos sugeridos en `testing_report.md` son propuestas condicionales: no se consideran ejecutados ni resultados.

## Aprobaciones humanas

El material revisado no contiene aprobación formal del alcance, de los criterios de aceptación, de la política CORS, de cambios o excepciones de dependencias ni de liberación. La evaluación técnica no las concede ni las presume. El informe de seguridad recibido declara explícitamente que la liberación no debe aprobarse con la evidencia actual.

Para reconsiderar este veredicto se requiere alinear y aprobar el alcance, aportar implementación y configuración del servidor, completar la revisión de dependencias y ejecutar las verificaciones pendientes. Cualquier aprobación reservada a personas debe permanecer en manos de sus responsables.

VEREDICTO: RECHAZADO