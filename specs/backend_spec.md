No incluyo código Python: el historial indica que **H-AUTH-05 trata de CORS y dependencias de autenticación**, mientras que la transferencia es un alcance distinto y su contrato está marcado como propuesta pendiente de aprobación. Implementar ahora exigiría inventar decisiones de API y persistencia.

```markdown
# backend_spec.md

## Estado

**Bloqueado; no se implementó código.**

El brief identifica la feature como **H-AUTH-05: “Restringir CORS de auth y revisar sus dependencias”**. No proporciona orígenes permitidos, rutas de autenticación afectadas, política de credenciales, dependencias a revisar ni criterios de aceptación detallados.

La solicitud de implementar transferencias entre cuentas propias no coincide con esa feature. El historial de Arquitectura califica la ruta, los campos, los errores y los criterios de transferencia como **propuestos y pendientes de aprobación**. Por tanto, no se tratan como contrato aprobado.

No se proporcionó estructura de repositorio, framework existente ni contrato de persistencia. **FastAPI sería únicamente una propuesta de framework**, no una decisión confirmada.

## Decisiones pendientes para H-AUTH-05

Antes de implementar hacen falta, como mínimo:

- Orígenes CORS permitidos y cómo se configuran por entorno.
- Rutas de auth a las que aplica la política.
- Métodos y cabeceras permitidos, política de credenciales y comportamiento de preflight.
- Dependencias de autenticación incluidas en la revisión, versiones presentes y política para actualizarlas.
- Criterios de aceptación y pruebas esperadas.
- Estructura existente del proyecto y configuración de despliegue.

No se debe habilitar `*` con credenciales. Tampoco se deben inventar orígenes permitidos ni modificar dependencias sin conocer el proyecto y el alcance aprobado.

## Pendientes para la transferencia solicitada

La propuesta del historial no es aprobación del contrato. Antes de implementar se requiere confirmar:

- Si la transferencia forma parte del alcance de H-AUTH-05 o es una feature separada.
- Método, ruta, esquema de solicitud y respuesta, y códigos HTTP/error definitivos.
- Mecanismo de autenticación y origen confiable de la identidad del cliente.
- Contrato de persistencia y transacción disponible.
- Formato, longitud y retención de `Idempotency-Key`.
- Límites aplicables y escalas monetarias admitidas.
- Política de ocultación de existencia de cuentas y decisiones de seguridad relacionadas.

## Trazabilidad de criterios y verificación

| Criterio | Código que lo cumple | Verificación |
|---|---|---|
| CORS de auth restringido a orígenes aprobados | No implementado: falta la configuración aprobada y el código del proyecto | Pendiente definir pruebas de orígenes permitidos/no permitidos y preflight |
| Dependencias de auth revisadas | No implementado: no se proporcionó manifiesto ni política de actualización | Pendiente revisar el manifiesto real y registrar versiones y acciones aprobadas |
| Transferencias con propiedad, validaciones y reglas de negocio | No implementado: alcance y contrato pendientes de aprobación | Pendiente definir pruebas de aceptación a partir del contrato aprobado |
| Atomicidad, concurrencia e idempotencia | No implementado: falta el contrato de persistencia y las decisiones de idempotencia | Pendiente de pruebas de integración concurrentes y de reintento |

## Comandos de verificación

No se ejecutaron comandos: no se proporcionó un repositorio ni un entorno de proyecto.

Si el proyecto Python existente usa estas herramientas, los comandos iniciales serían:

- `python -m pytest`
- `ruff check .`

Su disponibilidad y configuración deben verificarse en el repositorio antes de considerarlos comandos oficiales del proyecto.
```