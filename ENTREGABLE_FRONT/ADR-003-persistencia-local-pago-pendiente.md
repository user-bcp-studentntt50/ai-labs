# ADR-003: Persistencia local del pago pendiente (acotada al único intento en alcance)

Estado: Propuesta (pendiente de aprobación junto con el plan de `H-WEB` pagos).
Relacionado: [PROPUESTA_FRONT.md](./PROPUESTA_FRONT.md) §6.

## Contexto

T11 exige un estado "En proceso" "con mensaje tranquilizador y sin perder el intento si se cierra la
app". Al mismo tiempo, la HU deja expresamente en backlog (fuera de esta HU) la reutilización de la
`Idempotency-Key` y el botón "Reintentar"; solo está en alcance la generación de la clave para el único
envío y el bloqueo de doble toque.

Sin un backend propio de sesión para el front (el mock de pagos no tiene noción de "sesión de usuario"),
la única forma de "no perder el intento" tras cerrar y reabrir la pestaña/app es guardar algo en el
cliente que permita retomar el *polling* de `GET /payments/{id}` con el `paymentId` ya obtenido.

## Opciones consideradas

1. **No persistir nada**: si el usuario cierra la app durante "Procesando", al reabrir no hay forma de
   saber en qué quedó el intento desde la UI (tendría que confiar en que el backend lo resolvió, sin
   confirmación visual).
2. **Persistir en `localStorage`** un registro mínimo del intento en curso
   (`{paymentId, recipient, amountCents, startedAt}`) bajo la clave `ayni.pendingPayment`, y al entrar de
   nuevo a `/pagos` detectar ese registro y reanudar el *polling* con ese `paymentId`, sin generar una
   `Idempotency-Key` nueva ni permitir reintentar el envío.

## Decisión

Se adopta la opción 2, con el siguiente ciclo de vida:

- Se escribe el registro **solo** después de recibir una respuesta del `POST /payments` que incluya un
  `paymentId`/`id` (es decir, el pago ya fue creado en el backend: `202`, `200`, o `504` con
  `paymentId`).
- Se borra el registro **inmediatamente** al alcanzar cualquier estado terminal
  (`SUCCEEDED`/`FAILED`/`EXPIRED`).
- Al entrar a `/pagos` con un registro presente, la app reanuda el *polling* de ese `paymentId` en vez de
  permitir iniciar un pago nuevo, hasta llegar a terminal.
- No se reutiliza la `Idempotency-Key` original ni se permite un segundo `POST` para el mismo intento
  (eso sigue en backlog, según la HU).

## Consecuencias

- Mitiga la pérdida de visibilidad del resultado sin implementar reintentos ni reutilización de clave
  (ambos fuera de alcance).
- **Caso no cubierto, aceptado como riesgo conocido**: si el usuario cierra la app *antes* de que el
  navegador reciba la respuesta del `POST /payments` (es decir, antes de tener un `paymentId`), no hay
  nada que persistir y el resultado de ese intento queda sin confirmación visual para el usuario. Esto es
  coherente con que la reutilización de `Idempotency-Key` está fuera de alcance: no se puede ofrecer
  "reanudar" un envío que el cliente nunca confirmó haber hecho.
- El contenido guardado (IDs de pago, de contacto y montos en céntimos) no incluye credenciales ni datos
  personales sensibles; se considera aceptable guardarlo sin cifrar en `localStorage` para este mock. Si
  en el futuro se conecta a un backend real con datos personales, esta decisión debe revisarse.
- Un único punto de lectura/escritura (`pending-payment-storage.ts`) evita duplicar el acceso a
  `localStorage` en varios componentes.
