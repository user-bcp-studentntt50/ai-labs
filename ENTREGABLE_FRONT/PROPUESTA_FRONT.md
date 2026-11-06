# H-WEB — Pagos de bajo monto (Ayni): plan de implementación del front

Estado: **APROBADO** (2026-11-06) — gate de Architect cerrado. Ver §15 para la resolución de las
preguntas de §14. Este documento sigue sin código funcional; la implementación corresponde al rol
Developer.
Componente: `web/` (Angular 21, standalone, Vitest).
Regla de prioridad confirmada: **la HU es mandatoria; la imagen de mockup es solo referencial** (tipografía,
colores, tarjetas, chips). Donde la imagen difiera del flujo o alcance de la HU, gana la HU.

Insumos: [HU_Pagos.md](./HU_Pagos.md), [Tareas.md](./Tareas.md),
[bcp-wallet-mock-openapi.yaml](./bcp-wallet-mock-openapi.yaml),
[Flujo de Transferencia Ayni.png](<./Flujo de Transferencia Ayni.png>),
[environment de Postman](./bcp-wallet-mock-grupo4.postman_environment.json).

ADR relacionadas: [ADR-001](./ADR-001-fetch-nativo-vs-axios-pagos.md),
[ADR-002](./ADR-002-resolucion-por-polling-sin-resolve.md),
[ADR-003](./ADR-003-persistencia-local-pago-pendiente.md).

---

## 1. Impacto

Se agrega un módulo nuevo y autocontenido (`web/src/app/payments/`) que implementa el flujo del pagador:
**Home → Contacto → Monto → Confirmación → Procesando → Resultado** (Exitoso / Fallido / Expirado), consumiendo
el mock `wallet-demo`. No se modifica el dominio de autenticación/tareas existente (`login`, `dashboard`).
Único cambio en código existente: una línea nueva en las rutas raíz.

Fuera de alcance (quedan en backlog de la HU, **no se implementan**): historial (T6), comprobante (T9),
reintentos y reutilización de `Idempotency-Key`, instrumentación/eventos (T10), QR, "Pagar con enlace",
auth real, gestión de contactos.

## 2. Componentes afectados

| Componente | Tipo de cambio |
|---|---|
| `web/src/app/app.routes.ts` | Modificación mínima: agrega una ruta `pagos` antes del comodín `**` |
| `web/src/app/payments/**` | Nuevo, íntegro |
| `web/src/app/login/**`, `web/src/app/dashboard/**` | Sin cambios |
| `web/nginx.conf`, `web/angular.json` | Sin cambios (ver §10; cualquier cambio aquí requiere aprobación aparte) |
| `auth/`, `api/` | Sin cambios — el mock de pagos es un backend externo (cloud), no el backend del taller |

## 3. Contratos protegidos

- `POST /auth/login` y `GET /api/tasks` del backend del taller: intactos, no se tocan.
- Contrato del mock de pagos (OpenAPI): se consume tal cual; no se reinterpretan campos salvo la normalización
  camelCase (request) ↔ snake_case (response) documentada en la propia HU (T7).
- Nada de este módulo requiere login real; no se añade ni se quita un guard de autenticación.

---

## 4. Arquitectura por capas

```
web/src/app/payments/
  payments.routes.ts
  config/
    payments.config.ts       # URLs, límites, tiempos de polling, flags de overrides
    contacts.config.ts       # mapeo contacto UI → recipient del backend
    messages.es.ts           # catálogo único de textos (T11)
  domain/
    money.ts                 # soles <-> céntimos, formateo, aritmética entera
    amount-rules.ts          # piso técnico y rango de negocio (CA2/T8)
    alias-mask.ts            # enmascarado de alias (T2)
    payment-status.ts        # tipos de estado de dominio + mapeo desde backend
    error-mapper.ts          # código HTTP/error backend -> clave de catálogo
  data/
    payment-dto.ts           # tipos crudos del contrato (snake_case) + request (camelCase)
    idempotency-key.ts       # generación de clave por intento
    payments-api.ts          # fetch nativo + AbortController (ver ADR-001)
  application/
    payment-draft.model.ts   # borrador en memoria: contacto + monto
    payment-flow.store.ts    # estado de navegación/borrador (signals)
    payment-orchestrator.ts  # máquina de estados del intento (ver §6, ADR-002)
    pending-payment-storage.ts # persistencia localStorage (ver ADR-003)
    session-user.ts          # nombre a mostrar en el saludo (ver pregunta Q2)
  ui/
    shell/                   # layout común: título de pantalla, foco, "¿Necesitas ayuda?"
    home/                    # T1
    contact-selection/       # T2
    payment-amount/          # T3
    payment-confirmation/    # T4
    payment-processing/      # T5 (estado intermedio)
    payment-result/          # T5 (estado terminal)
```

### 4.1 Capa `domain` (sin Angular, funciones puras)

Responsabilidad: reglas de negocio que no dependen de HTTP ni UI. 100 % cubierta por pruebas unitarias.

Contrato de tipos (referencia para quien implemente; no es código funcional):

```ts
// money.ts
function solesToCents(input: string): number | null;   // null si no es parseable
function centsToDisplay(cents: number): string;        // "S/ 15.00"

// amount-rules.ts
interface AmountLimits { minCaptureCents: number; minBusinessCents: number; maxBusinessCents: number; }
type AmountValidation =
  | { ok: true }
  | { ok: false; reason: 'BELOW_CAPTURE_FLOOR' | 'BELOW_BUSINESS_MIN' | 'ABOVE_BUSINESS_MAX' | 'NOT_A_NUMBER' };
function validateAmount(cents: number | null, limits: AmountLimits): AmountValidation;

// alias-mask.ts
function maskAlias(alias: string): string;              // "maria.sanchez" -> "@ma•••••••hez"

// payment-status.ts
type PaymentOutcome = 'SUCCEEDED' | 'FAILED' | 'EXPIRED';
type BackendPaymentStatus = 'PENDING' | 'SUCCEEDED' | 'REJECTED' | 'REVERSED';

// error-mapper.ts
type KnownErrorCode =
  | 'INSUFFICIENT_FUNDS' | 'WALLET_NOT_ACTIVE' | 'VALIDATION_ERROR' | 'NOT_FOUND'
  | 'PAYLOAD_TOO_LARGE' | 'GROUP_LIMIT_RESET_REQUIRED' | 'PROVIDER_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN';
function mapHttpErrorToMessageKey(status: number, errorBody: { error?: string } | null): MessageKey;
```

### 4.2 Capa `data` (integración HTTP)

Responsabilidad: hablar con el mock, normalizar camelCase ↔ snake_case, nunca exponer `fingerprint`/`idem`
fuera de esta capa.

```ts
// payment-dto.ts
interface CreatePaymentRequestDto {
  walletId: string; recipient: 'contact-demo' | 'merchant-demo';
  amountCents: number; currency: 'PEN'; scenario?: ScenarioOverride;
}
interface PaymentResponseDto {
  id: string; wallet_id: string; recipient: string; amount: number;
  status: BackendPaymentStatus; scenario: string; idem: string; fingerprint: unknown;
}
interface WalletResponseDto {
  id: string; status: 'ACTIVE' | 'PENDING' | 'REJECTED';
  balance: number; reserved: number; available: number; currency: 'PEN';
}
interface ErrorResponseDto { error: string; processed?: boolean; paymentId?: string; status?: BackendPaymentStatus; }

// payments-api.ts — dominio ya normalizado, sin snake_case fuera de esta capa
interface Payment { id: string; walletId: string; recipient: string; amountCents: number; status: BackendPaymentStatus; }
interface Wallet { id: string; status: string; availableCents: number; currency: 'PEN'; }

interface PaymentsApi {
  getWallet(id: string, signal?: AbortSignal): Promise<ApiResult<Wallet>>;
  createPayment(req: CreatePaymentRequestDto, idempotencyKey: string, signal?: AbortSignal): Promise<ApiResult<Payment>>;
  getPayment(id: string, signal?: AbortSignal): Promise<ApiResult<Payment>>;
}
type ApiResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'httpError'; status: number; body: ErrorResponseDto | null }
  | { kind: 'networkError' };
```

- `idempotency-key.ts`: `function newIdempotencyKey(): string` (`crypto.randomUUID()`), una sola vez por
  intento; **no se reutiliza** (confirmado como backlog por la HU).
- Headers: `Content-Type: application/json`, `Idempotency-Key` solo en `POST /payments`. `X-Mock-Latency-Ms`
  únicamente si `payments.config.ts.allowMockOverrides` está activo (no-prod).

### 4.3 Capa `application` (orquestación y estado)

- `PaymentDraftModel`: `{ contactId: string | null; amountCents: number | null }`, vive en memoria (signal),
  se limpia al salir del flujo o al llegar a un resultado terminal.
- `PaymentFlowStore`: expone el borrador y helpers de navegación guardados (p. ej. impedir llegar a
  "Confirmación" sin contacto y monto válidos — guard de ruta liviano, no de autenticación).
- `PaymentOrchestrator`: única pieza con la máquina de estados (§6). Recibe `PaymentsApi` e
  `IdempotencyKeyFactory` por constructor (inyección manual, sin librerías nuevas) para ser 100 % testeable
  con dobles de prueba.
- `PendingPaymentStorage`: lee/escribe `localStorage['ayni.pendingPayment']`; ver ADR-003.
- `SessionUser`: una única función/clase que decide el nombre a mostrar (ver pregunta Q2).

### 4.4 Capa `ui` (componentes Angular standalone)

Reglas: cada componente hace una sola cosa (home, selección, monto, confirmación, procesando, resultado);
ningún componente llama `fetch` directamente, todos pasan por `PaymentOrchestrator`/`PaymentsApi` inyectados;
ningún texto literal en plantillas (todo via `messages.es.ts`); `shell` centraliza el enlace de ayuda y el
manejo de foco para cumplir T11 sin duplicarlo en cada pantalla.

| Componente | Responsabilidad única | Entra desde | Sale hacia |
|---|---|---|---|
| `home` | saludo + saldo (`GET /wallets/wallet-demo`) + botón "Nuevo pago" | ruta raíz `/pagos` | `contact-selection` |
| `contact-selection` | listar/buscar contactos del mock local (T2) | `home` | `payment-amount` |
| `payment-amount` | captura de monto, origen de solo lectura (T3) | `contact-selection` | `payment-confirmation` |
| `payment-confirmation` | resumen + Confirmar/Corregir (T4/CA1) | `payment-amount` | `payment-processing` o vuelta a `payment-amount` |
| `payment-processing` | estado intermedio con mensaje tranquilizador (T5) | `payment-confirmation` (o reanudación, ver ADR-003) | `payment-result` (automático al resolver) |
| `payment-result` | único resultado terminal + "Volver al inicio" (T5/CA3/CA4) | `payment-processing` | `home` |

## 5. Rutas

```
/pagos                    -> redirectTo 'inicio'
/pagos/inicio              -> home
/pagos/contacto             -> contact-selection
/pagos/monto                -> payment-amount
/pagos/confirmar             -> payment-confirmation
/pagos/procesando             -> payment-processing
/pagos/resultado                -> payment-result
```

Carga diferida (`loadChildren` a `payments.routes.ts`) desde `app.routes.ts`. Ruta `/pagos/monto`,
`/pagos/confirmar`, etc. redirigen a `/pagos/inicio` si no hay un borrador válido en `PaymentFlowStore`
(protección simple de integridad del flujo, no de seguridad).

## 6. Máquina de estados del intento de pago (T7)

Estados: `IDLE → SUBMITTING → PROCESSING → SUCCEEDED | FAILED | EXPIRED` — **un único estado terminal por
intento**.

| Evento / respuesta | Transición | Justificación HU |
|---|---|---|
| Usuario toca "Confirmar" | `IDLE → SUBMITTING`, botón deshabilitado de inmediato | evita doble toque (T7/T12) |
| `POST /payments` → `202`/`200 PENDING` | `SUBMITTING → PROCESSING`, inicia *polling* de `GET /payments/{id}` | T7 |
| `POST /payments` → `504` con `paymentId` (`TIMEOUT_AFTER_PROCESSING`) | `SUBMITTING → PROCESSING`, *polling* con ese `paymentId` | CA3/T7: "no mostrar Expirado ni Fallido ante un 504" |
| `POST /payments` → `503 PROVIDER_ERROR` | `SUBMITTING → FAILED` | T7: "no se creó operación ni reserva" |
| `POST /payments` → `409` (`INSUFFICIENT_FUNDS`/`WALLET_NOT_ACTIVE`), `400`, `404`, `413`, `429` | `SUBMITTING → FAILED` con mensaje por código | T7 |
| `POST /payments` → sin respuesta (red caída) | `SUBMITTING → FAILED` con mensaje "no pudimos confirmar" (ver Q9) | no cubierto explícitamente por la HU |
| *Polling*: `GET /payments/{id}` → `SUCCEEDED` | `PROCESSING → SUCCEEDED` | CA3 |
| *Polling*: `GET /payments/{id}` → `REJECTED` | `PROCESSING → FAILED` | CA3 |
| *Polling*: `GET /payments/{id}` → `REVERSED` | `PROCESSING → FAILED` (mensaje propio, ver Q9) | no cubierto explícitamente por la HU |
| *Polling*: sigue `PENDING` al superar el tiempo máximo propio | `PROCESSING → EXPIRED` | CA3/T7 |
| *Polling*: error transitorio (red/5xx) | se tolera hasta 3 consecutivos sin cambiar de estado; al superarlo, `PROCESSING → EXPIRED` | continuidad del intento sin declarar Fallido prematuro |

Reglas transversales: no hay reintento del `POST` dentro de esta HU (backlog); el *polling* se cancela
(`AbortController`) al desmontar `payment-processing`, salvo que exista un intento pendiente persistido
(ADR-003), en cuyo caso se reanuda al volver a entrar a `/pagos`.

## 7. Reglas de monto (T3/T8/CA2)

- Captura en texto, `inputmode="decimal"`, máximo 2 decimales; conversión a céntimos con aritmética entera
  (sin `parseFloat * 100`).
- Piso técnico de captura: S/ 0.01 (1 céntimo) — validación de formato, siempre activa.
- Rango de negocio "bajo monto": S/ 10 – S/ 1000 (1000–100000 céntimos) — validado **antes** de pasar a
  confirmación, con mensaje claro y específico por motivo (`BELOW_BUSINESS_MIN` / `ABOVE_BUSINESS_MAX`).
- `AmountLimits` vive en `payments.config.ts` con forma `limitsByChannel: Record<string, AmountLimits>` para
  permitir variar por proveedor/canal sin tocar código (pregunta abierta de la HU, T8); un único canal
  `'default'` mientras no haya más configuración de negocio.
- El backend no aplica este rango (solo exige `amountCents >= 1`); se documenta que la validación de negocio
  es responsabilidad exclusiva del front en este mock.

## 8. Accesibilidad e inclusión (T11/CA5)

- Tipografía raíz ≥ 18 px (`1.125rem`); objetivos táctiles ≥ 48 px (botones, chips, filas de contacto).
- Contraste AA verificado por combinación de color antes de fijar la paleta final (no se copian literalmente
  los colores de la imagen sin medir contraste).
- Un `<h1>` por pantalla; foco programático al `<h1>` en cada navegación de `shell`.
- `aria-live="polite"` en el mensaje de "Procesando"; `role="alert"` en mensajes de error.
- `<label>` reales asociados a campo de búsqueda (T2) y campo de monto (T3); nunca placeholder como único
  label.
- Iconos siempre acompañados de texto (`aria-hidden="true"` en el glifo).
- "¿Necesitas ayuda?" visible en las seis pantallas, vía `shell` (un solo punto de mantenimiento).
- Catálogo único `messages.es.ts`: toda cadena visible sale de ahí; una prueba unitaria verifica que cada
  clave usada en los componentes exista en el catálogo (evita literales sueltos y cadenas huérfanas).
- `prefers-reduced-motion` respetado en cualquier animación del estado "Procesando".

## 9. Configuración (`payments.config.ts`)

```ts
interface PaymentsConfig {
  apiBaseUrl: string;            // ver pregunta Q5
  walletId: string;              // 'wallet-demo'
  pollIntervalMs: number;        // default propuesto: 2000
  pollTimeoutMs: number;         // default propuesto: 30000
  limitsByChannel: Record<string, AmountLimits>;
  allowMockOverrides: boolean;   // false en build de producción
}
```

Con `allowMockOverrides` activo: `?scenario=` (los seis escenarios del mock) y `?latency=` (→
`X-Mock-Latency-Ms`), equivalentes a la variable `latencyMs` del environment de Postman. Nunca se incluyen
secretos; el mock no requiere autenticación.

## 10. Entornos / despliegue — sin decidir (ver Q5, Q6)

El resto de `web/` no usa `environment.ts` de Angular (no hay `fileReplacements` en `angular.json`); las URLs
del backend del taller están hardcodeadas en `login`/`dashboard`. Para mantener el cambio mínimo, se propone
el mismo patrón: un valor por defecto hardcodeado en `payments.config.ts` (la URL cloud del Grupo 4), sin
tocar `angular.json` ni `nginx.conf`. Esto depende de confirmar que no hay bloqueo de CORS (Q6) y de que no se
requiera una URL distinta por entorno (Q5).

---

## 11. Pruebas necesarias (antes de cada incremento)

| Capa | Técnica | Casos obligatorios |
|---|---|---|
| `domain/money`, `amount-rules` | unitarias | `0.01`, `0.001` (inválido), `9.99` (bajo mínimo), `10.00` (límite), `1000.00` (límite), `1000.01` (sobre máximo), `1,5` (coma decimal), vacío, no numérico |
| `domain/alias-mask` | unitarias | alias cortos (≤ 5 caracteres), con punto, con dominio |
| `domain/error-mapper` | unitarias | cada código HTTP/error de la tabla T7 → clave de catálogo existente |
| `data/payments-api` | unitarias con `fetch` doblado | *fixtures* basadas en los ejemplos del OpenAPI; verifica cabecera `Idempotency-Key`, cuerpo camelCase saliente y normalización snake_case entrante |
| `application/payment-orchestrator` | unitarias con reloj simulado | `APPROVED`, `REJECTED`, `PENDING` → Expirado, `DELAYED_APPROVAL` → Expirado, `TIMEOUT_AFTER_PROCESSING` (504 → *polling* → Exitoso), `PROVIDER_ERROR`, `INSUFFICIENT_FUNDS`, doble toque (segunda invocación no dispara segundo `POST`), error de red en el `POST`, `REVERSED` |
| `application/pending-payment-storage` | unitarias | guarda, reanuda, limpia al terminal |
| `messages.es` | unitaria de integridad | todas las claves referenciadas por los componentes existen en el catálogo |
| UI (manual) | checklist | navegación por teclado, lector de pantalla, zoom 200 %, contraste, "¿Necesitas ayuda?" visible en las 6 pantallas |

Meta: ≥ 85 % de cobertura del código nuevo (`python tools/lab.py test web`). No se agregan `jsdom` ni
Playwright sin tu aprobación explícita (cambiaría `vitest.config.ts` y añadiría dependencias).

## 12. Estrategia incremental (un PR revisable por punto)

1. **Spike de conectividad**: confirmar CORS y comportamiento real del mock cloud (`GET /wallets/wallet-demo`
   desde un origen de navegador). Sin código de producto; solo evidencia para decidir Q6.
2. Cimientos: `payments.config.ts`, `contacts.config.ts`, `messages.es.ts`, `domain/money`,
   `domain/amount-rules`, `domain/alias-mask` + pruebas.
3. `data/payment-dto.ts`, `data/payments-api.ts`, `domain/error-mapper.ts` + pruebas con *fixtures*.
4. `application/payment-orchestrator.ts`, `application/pending-payment-storage.ts`,
   `application/session-user.ts` + pruebas de la tabla de escenarios.
5. `ui/shell` + `ui/home` (T1) + `payments.routes.ts` + entrada en `app.routes.ts`.
6. `ui/contact-selection` + `ui/payment-amount` (T2, T3).
7. `ui/payment-confirmation` + `ui/payment-processing` + `ui/payment-result` (T4, T5).
8. Endurecimiento de inclusión (auditoría T11) y guion de pruebas manuales (T12, incluye escenarios del mock
   y usabilidad con usuarios no nativos digitales).

## 13. Riesgos / trade-offs

| Riesgo | Mitigación |
|---|---|
| CORS bloquea la llamada desde el navegador al dominio cloud | Incremento 1 (spike) antes de construir nada más |
| Declarar "Fallido" con un pago que en realidad sí se creó (504, caída de red tras enviar) | 504 continúa *polling* (ADR-002); error de red en el `POST` se distingue de error de red durante *polling* |
| Doble cobro por doble toque | Bloqueo de botón inmediato + una sola `Idempotency-Key` por intento |
| Errores de redondeo en dinero | Aritmética entera exclusivamente, con pruebas de borde |
| Copys/etiquetas aún no cerradas con producto | Catálogo único, editable sin tocar componentes |
| Mock en memoria / límite de grupo (`429 GROUP_LIMIT_RESET_REQUIRED`) | Mensaje claro; `POST /control/reset` no se invoca desde la app (es herramienta de prueba) |
| Discrepancia HU vs OpenAPI sobre `/payments/{id}/resolve` | Se sigue la HU (ADR-002); se deja registrado como pregunta para backend/producto, no se resuelve aquí |
| Cobertura de UI con Vitest en entorno Node (sin DOM) | Componentes delgados; toda la lógica testeable vive en `domain`/`data`/`application` |

---

## 14. Preguntas específicas pendientes (gate antes de implementar)

1. **Punto de entrada / IA**: ¿el flujo de pagos es un árbol de rutas independiente (`/pagos/...`) sin
   relación con `/dashboard` (que hoy es de tareas, otro dominio), o debe enlazarse desde ahí con un botón?
2. **Nombre en el saludo (T1)**: ¿tomamos `workshop_user` de `localStorage` si existe (reutilizando el login
   actual) o siempre un nombre de demostración fijo (p. ej. "Usuario")?
3. **Nombres visibles de los contactos**: el backend solo entiende `contact-demo` y `merchant-demo`. ¿Usamos
   nombres ficticios (p. ej. "María Sánchez" / "Bodega El Sol", inspirados en la imagen) o etiquetas genéricas
   ("Contacto de prueba" / "Comercio de prueba")?
4. **Cantidad de contactos en la lista**: ¿mostramos exactamente 2 (uno por `recipient` disponible) o se
   acepta tener varios "contactos" de UI que reutilicen el mismo `recipient` de backend?
5. **URL base del mock**: ¿confirmamos como válido hardcodear
   `https://bcp-wallet-mock.yefri.workers.dev/groups/4` (tomado del environment de Postman) como valor por
   defecto en `payments.config.ts`, igual que el resto de `web/` hardcodea sus URLs? ¿O necesitan que varíe
   por entorno (local/stage/prod), lo que implicaría tocar `angular.json`/`nginx.conf`?
6. **CORS**: ¿ya probaron ustedes una llamada real desde un navegador a ese dominio cloud? Si no, ¿autorizan
   que el incremento 1 sea exactamente ese spike antes de seguir?
7. **Tiempos de "Procesando"**: ¿aceptan como default 2 s de intervalo de *polling* y 30 s de tiempo máximo
   antes de "Expirado", o ya existe un acuerdo de tiempos con backend/producto?
8. **Copys provisionales**: mientras producto no cierre las etiquetas (pregunta abierta de la propia HU),
   ¿aprueban placeholders como "Tu pago se hizo", "No se hizo el pago, tu dinero está a salvo" y "Aún no
   tenemos respuesta, tu dinero está protegido" para el catálogo inicial?
9. **`REVERSED` y error de red no cubiertos por la HU**: ¿los tratamos ambos como "Fallido" con un mensaje
   propio cada uno (sin acción de reintento, coherente con el backlog), o requieren un tratamiento visual
   distinto al resto de fallos?
10. **Colección Postman**: ¿pueden compartirla? Permitiría anclar las pruebas de contrato (`payments-api`) al
    comportamiento medido del mock, en vez de inferirlo solo del OpenAPI.

## 15. Resolución del gate — aprobado 2026-11-06

El plan queda **aprobado**. Resolución de las preguntas de §14: donde el plan ya proponía un valor por
defecto (diseño o configuración), la aprobación lo confirma tal cual; donde no había un valor propuesto,
se deja un supuesto razonable, explícito y reversible, para no bloquear el inicio de la implementación.

| # | Resolución |
|---|---|
| Q1 | Confirmado por diseño: árbol de rutas independiente `/pagos/...` (§5), sin enlace desde `/dashboard`. |
| Q2 | **Supuesto** (sin instrucción explícita): `SessionUser` usa un nombre de demostración fijo configurable (p. ej. "Usuario"), sin leer `workshop_user` de `localStorage`, para no acoplar el módulo de pagos al dominio de login. Reversible sin impacto arquitectónico. |
| Q3 | **Supuesto**: nombres ficticios de demostración — "María Sánchez" para `contact-demo`, "Bodega El Sol" para `merchant-demo` — en `contacts.config.ts`, solo como copy (la imagen sigue siendo referencial, no normativa del flujo). |
| Q4 | **Supuesto**: la lista de contactos muestra exactamente 2 ítems, uno por `recipient` disponible; sin duplicados de UI sobre el mismo `recipient`. |
| Q5 | Confirmado por diseño (§10): URL cloud del Grupo 4 hardcodeada como valor por defecto en `payments.config.ts`, mismo patrón que `login`/`dashboard`. |
| Q6 | Confirmado: el incremento 1 (spike de CORS, §12) procede como primer paso antes de construir el resto. |
| Q7 | Confirmado por diseño (§9): 2 s de intervalo de *polling*, 30 s de tiempo máximo antes de "Expirado". |
| Q8 | Confirmado: los placeholders de copy propuestos quedan en el catálogo inicial (`messages.es.ts`), editable sin tocar componentes. |
| Q9 | Confirmado por diseño (§6): `REVERSED` y error de red en el `POST` se tratan ambos como `FAILED`, cada uno con su propia clave de mensaje en el catálogo. |
| Q10 | **Pendiente, no bloqueante**: la colección Postman no fue entregada. Las pruebas de contrato de `payments-api` se anclan a los ejemplos del OpenAPI mientras tanto; si llega la colección más adelante, se usa para reforzar esas pruebas sin cambiar el diseño. |

### Siguiente paso

El gate de Architect queda cerrado: alcance, impacto, contratos, riesgos y estrategia de pruebas están
aprobados. La implementación (código funcional en `web/src/app/payments/`, pruebas unitarias, PRs por
incremento) corresponde al rol **Developer**, siguiendo este plan y los tres ADR, empezando por el
incremento 1 (spike de CORS) del §12.

## 16. Evidencia de implementación (issue #30, rama `feature/h-web-01-pagos-bajo-monto`)

Incrementos 1–7 del §12 implementados en `web/src/app/payments/` (dominio, configuración, datos,
aplicación y UI de las seis pantallas T1–T5), con la ruta `/pagos` enlazada desde `app.routes.ts`.

**Comandos ejecutados y resultado real:**

```text
python tools/lab.py test web
  -> npm test            : 15 archivos, 80 pruebas, todas en verde
  -> npm run test:coverage: mismas 80 pruebas en verde;
       domain/data/application/config: 85–100% de cobertura de statements
       (único objetivo de pruebas unitarias, por diseño del plan §11)
  -> npm run build        : build de producción exitosa (solo warnings
       preexistentes de axios/lodash en login, no relacionados con este cambio)
```

**Pendiente frente a la meta de cobertura del 85% (contrato de `web`, regla 7):** los componentes de
`ui/` (home, contact-selection, payment-amount, payment-confirmation, payment-processing,
payment-result, shell) no tienen pruebas unitarias propias — Vitest corre en `environment: 'node'` sin
DOM, y agregar pruebas de componentes requeriría `jsdom` y Angular `TestBed`, dependencias nuevas que el
plan (§11) dejó fuera "sin aprobación explícita". La lógica de negocio que esos componentes usan (validación,
orquestación, mapeo de errores, catálogo de mensajes) sí está cubierta al 85–100% en las capas que la
contienen. Queda como candidato de backlog, no resuelto en este issue: decidir si se aprueba agregar
`jsdom`/`TestBed` para cubrir también la capa `ui/` con pruebas automatizadas, o si el checklist manual de
accesibilidad (T11/T12) es la verificación aceptada para esa capa.

**Hallazgo secundario confirmado por evidencia real (ver comentario del incremento 1 en el issue #30):**
en el mock cloud compartido, un pago no llega a estado terminal por *polling* puro sin que algo externo
entregue el evento; esto aplica también al escenario `APPROVED`, no solo a `PENDING`/`DELAYED_APPROVAL`.
No se resuelve en este issue (la app no debe invocar los endpoints de control, ver ADR-002); queda
documentado para la guía de pruebas manuales (T12).
