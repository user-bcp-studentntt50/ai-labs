# ADR-002: Resolución del pago por *polling* exclusivo, sin usar `POST /payments/{id}/resolve`

Estado: Propuesta (pendiente de aprobación junto con el plan de `H-WEB` pagos).
Relacionado: [PROPUESTA_FRONT.md](./PROPUESTA_FRONT.md) §6, hallazgo D4 de la versión previa de este plan.

## Contexto

El OpenAPI del mock sí define `POST /payments/{id}/resolve` (tag "W5 · Fallas y reversos"): consulta al
proveedor sin crear otro cobro; si el pago sigue `PENDING` devuelve `202` con `escalated: true` y abre un
caso de soporte; si ya terminó, aplica el resultado y devuelve `200`.

Sin embargo, la HU ([HU_Pagos.md](./HU_Pagos.md), sección "Contexto" y T7) afirma explícitamente que
"no existe en el contrato un endpoint de resolución forzada para producción" y que "la única forma de
conocer el estado terminal en producción es el *polling* de `GET /payments/{id}`". La HU trata
`/payments/{id}/resolve`, `/callbacks/payments` y `/control/provider/{id}/complete` como herramientas de
mock para preparar escenarios de prueba, no como parte del flujo de producción de la app.

Esta es una contradicción real entre el contrato técnico (OpenAPI) y el texto de negocio (HU). Como la HU
es mandataria para este cambio (decisión del dueño del producto), se resuelve a favor de la HU, dejando
constancia de la discrepancia para que se revise aparte con backend/producto.

## Opciones consideradas

1. **Usar `/resolve`** para acelerar la resolución de pagos `PENDING`/`DELAYED_APPROVAL` (reduce el tiempo
   que el usuario pasa en "Procesando").
2. **Solo *polling* de `GET /payments/{id}`**, con un tiempo máximo propio de la app que produce
   "Expirado" si no hay estado terminal a tiempo, siguiendo la HU al pie de la letra.

## Decisión

Se adopta la opción 2. La app de producción nunca llama a `/payments/{id}/resolve`,
`/callbacks/payments` ni `/control/provider/{id}/complete`. El único mecanismo de resolución es el
*polling* de `GET /payments/{id}` descrito en el plan (§6), incluyendo el manejo especial de
`504 TIMEOUT_AFTER_PROCESSING` (se continúa el *polling*, nunca se declara terminal por ese código).

## Consecuencias

- En los escenarios `PENDING` y `DELAYED_APPROVAL` del mock (que, según el propio OpenAPI, "esperan
  control manual"), la app **no tiene forma de alcanzar un estado terminal real** sin que alguien dispare
  ese control manual por fuera de la app; el usuario verá "Expirado" al agotarse el tiempo máximo de
  *polling*, aunque el pago pueda resolverse más tarde en el backend.
- Esto es consistente con la HU (que acepta ese resultado como "Expirado" legítimo) pero es una limitación
  conocida del entorno de pruebas, no un defecto de la implementación.
- Se dejan registradas en el plan ([PROPUESTA_FRONT.md](./PROPUESTA_FRONT.md), hallazgo D4) la
  recomendación de confirmar con backend/producto si el contrato real de producción expondrá o no
  `/resolve`; si lo expone, esta ADR debería revisarse.
- No se implementa ningún código que invoque `/resolve`, `/callbacks/payments` ni
  `/control/provider/{id}/complete` desde `payments-api.ts`.
