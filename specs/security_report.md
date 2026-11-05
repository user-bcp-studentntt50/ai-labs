# Informe de seguridad — H-AUTH-05

**Feature:** Restringir CORS de auth y revisar sus dependencias  
**Fecha de evaluación:** 2026-11-05  
**Decisión:** **No aprobar la liberación.** La evaluación queda bloqueada por falta de implementación y evidencia verificable.

## Resumen ejecutivo

El material recibido no demuestra que se haya restringido CORS en el servidor de autenticación ni que se hayan revisado sus dependencias. No se proporcionaron repositorio, manifiestos, configuración del servidor, resultados de pruebas ni salidas de herramientas. El informe de pruebas confirma que la ejecución fue **NO EJECUTADA**.

Por tanto, no es posible confirmar que los controles de seguridad estén implementados o que los hallazgos críticos estén corregidos. Tampoco se presentó una excepción formal y documentada que permita aceptar el riesgo. **La aprobación de seguridad debe permanecer bloqueada** hasta recibir evidencia y cerrar las condiciones indicadas abajo.

No se identificó un hallazgo crítico confirmado; esto refleja la ausencia de evidencia, no una conclusión de que la implementación sea segura.

## Alcance y evidencia revisada

Se revisó el historial proporcionado para H-AUTH-05:

- **Arquitectura:** señala que faltan criterios formales y decisiones sobre orígenes, rutas, credenciales y dependencias. La transferencia entre cuentas aparece como propuesta pendiente de aprobación.
- **Backend:** declara que no se implementó código y que faltan repositorio, configuración y alcance aprobado.
- **Frontend:** declara que no hay cambios de interfaz confirmados. Incluye un servicio Angular que valida una URL base, pero no configura ni verifica la política CORS del servidor.
- **Pruebas:** indica que no se proporcionaron repositorio ni entorno y que las pruebas no se ejecutaron. Los casos descritos son planes de prueba, no resultados.

No se ejecutaron herramientas ni comandos para esta evaluación.

## Hallazgos y riesgos

| ID | Hallazgo | Severidad para la decisión de liberación | Evidencia y riesgo |
|---|---|---|---|
| SEC-01 | Política CORS de auth no verificada | **Bloqueante** | No se aportaron configuración ni código del servidor, ni resultados que demuestren el comportamiento con orígenes permitidos y no permitidos. No se puede descartar una configuración demasiado permisiva. |
| SEC-02 | Revisión de dependencias de auth no acreditada | **Bloqueante** | No hay manifiestos, lockfiles, inventario de dependencias, resultados de análisis ni registro de acciones. No se puede evaluar exposición conocida ni confirmar remediaciones. |
| SEC-03 | Criterios de aceptación y configuración pendientes | **Bloqueante** | No se definieron formalmente orígenes, rutas, métodos, cabeceras ni política de credenciales. Sin una política aprobada no se puede determinar si la configuración es correcta. |
| SEC-04 | Cobertura de pruebas inexistente como evidencia | **Bloqueante** | Los casos propuestos no se ejecutaron y no se aportaron pruebas de integración o evidencia de navegador. No hay resultados verificables para certificar el cambio. |
| SEC-05 | Alcance de transferencia no alineado | **Riesgo de alcance** | La propuesta de transferencias no corresponde claramente a H-AUTH-05 y está marcada como pendiente de aprobación. No debe tratarse como criterio de esta liberación sin una decisión explícita de producto y seguridad. |

**Hallazgos críticos confirmados:** ninguno con la evidencia disponible.  
**Hallazgos críticos corregidos o con excepción formal:** no verificable; no se presentó evidencia de corrección ni una excepción formal documentada.

## Evaluación de seguridad

- CORS debe configurarse y verificarse en el servidor de autenticación. La validación Angular de una URL base no sustituye ese control.
- No se debe usar `Access-Control-Allow-Origin: *` junto con credenciales. Si se permiten credenciales, debe verificarse que el origen autorizado sea explícito y exacto.
- CORS no sustituye autenticación ni autorización: clientes que no son navegadores no están sujetos a las restricciones CORS del navegador.
- La revisión de dependencias debe corresponder a los manifiestos y lockfiles reales e incluir las dependencias relevantes para auth. Un escaneo automatizado, por sí solo, no acredita que se hayan evaluado y resuelto los hallazgos.
- Los casos de prueba descritos en el historial son adecuados como plan inicial, pero **no constituyen evidencia de aprobación** hasta que se ejecuten y se conserven sus resultados.

## Condiciones para volver a evaluar y aprobar

1. **Aprobar la política CORS**: documentar orígenes permitidos por entorno, rutas de auth cubiertas, métodos, cabeceras, preflight y política de credenciales.
2. **Aportar la implementación del servidor** y demostrar que los orígenes no autorizados no reciben una autorización CORS efectiva. Incluir pruebas de orígenes limítrofes, métodos y cabeceras no permitidos y el caso de credenciales, según la política aprobada.
3. **Aportar los manifiestos y lockfiles reales**, identificar las dependencias de autenticación directas y transitivas y conservar resultados de la revisión de vulnerabilidades.
4. **Documentar las acciones sobre dependencias**: hallazgos, versiones afectadas, remediaciones aprobadas y riesgos residuales. Cualquier excepción debe contar con responsable, justificación, alcance, vencimiento y aprobación formal.
5. **Ejecutar pruebas en un entorno representativo** y aportar resultados reproducibles, incluyendo configuración efectiva del servidor y evidencia de que el preflight no ejecuta operaciones de negocio.
6. Confirmar que no se incluyeron cambios de persistencia o de transferencia fuera del alcance aprobado. Si la transferencia forma parte del cambio, debe tratarse con criterios y revisión de seguridad propios.

## Decisión final

**H-AUTH-05 no recibe aprobación de seguridad para liberar con la evidencia actual.** La decisión podrá revisarse cuando se aporten la política aprobada, la implementación, la revisión de dependencias y resultados de pruebas ejecutadas. No se acepta una excepción tácita por falta de información.