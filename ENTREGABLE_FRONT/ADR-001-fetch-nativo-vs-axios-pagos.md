# ADR-001: Cliente HTTP del módulo de pagos — `fetch` nativo en vez de `axios`

Estado: Propuesta (pendiente de aprobación junto con el plan de `H-WEB` pagos).
Relacionado: [PROPUESTA_FRONT.md](./PROPUESTA_FRONT.md) §4.2.

## Contexto

`web/src/app/login` y `web/src/app/dashboard` usan `axios` para llamar al backend del taller
(`/auth/login`, `/api/tasks`). El módulo nuevo de pagos necesita:

- cancelar una petición en curso (al salir de la pantalla de "Procesando" o al desmontar el
  componente, para no seguir haciendo *polling* en segundo plano);
- tipar con precisión el cuerpo saliente (camelCase) y la respuesta entrante (snake_case) del mock de
  pagos, sin el `any` implícito que hoy usan `login`/`dashboard`;
- no añadir dependencias nuevas al `package.json` si se puede evitar (contrato de `web`, regla 5).

## Opciones consideradas

1. **Reutilizar `axios`**, igual que el resto de `web/`, para mantener un único patrón de cliente HTTP
   en todo el proyecto.
2. **Usar `fetch` nativo del navegador** (con `AbortController`), encapsulado en
   `payments/data/payments-api.ts`, sin tocar `login`/`dashboard`.

`axios` ya soporta cancelación (`AbortController` desde la v0.22) y tipado genérico, así que
técnicamente ambas opciones cubren el caso de uso. La diferencia real es de alcance y de precedente:
adoptar `fetch` evita acoplar el módulo nuevo al mismo estilo (`any`, falta de capas) que hoy tienen
`login`/`dashboard`, sin necesidad de refactorizarlos primero.

## Decisión

Se adopta la opción 2: `fetch` nativo, encapsulado exclusivamente dentro de
`payments/data/payments-api.ts`. `login` y `dashboard` siguen usando `axios` sin cambios.

## Consecuencias

- No se agrega ninguna dependencia nueva al `package.json`.
- Convive en el repositorio un cliente HTTP distinto por módulo (`axios` en login/dashboard, `fetch`
  en pagos); se acepta esta inconsistencia como costo de no tocar código fuera del alcance de la HU,
  en vez de forzar un patrón único en todo `web/` sin que haya sido pedido.
- `payments-api.ts` debe resolver por sí mismo lo que `axios` da por defecto: *parseo* de JSON,
  normalización de errores HTTP y `timeout` (vía `AbortController` + `setTimeout`).
- Si en el futuro se decide unificar el cliente HTTP de todo `web/`, ese es un cambio aparte, no de
  esta HU.
