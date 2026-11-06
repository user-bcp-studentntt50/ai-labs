# Confirmación de pagos de bajo monto (refinada)

Como pagador,
quiero completar una transferencia de bajo monto y recibir una confirmación definitiva del resultado,
para confiar en si el pago se realizó o no.

## Criterios de aceptación (actualizados)

1. **CA1 — Confirmación previa** (T4): antes de confirmar, el pagador ve un resumen en texto simple (p. ej.
   "Vas a pagar S/ 15.00 a Juan Pérez") con los botones **Confirmar** y **Corregir**.
2. **CA2 — Rango de bajo monto** (T7, T8): se considera "bajo monto" el rango entre S/ 10 (mínimo) y
   S/ 1000 (máximo); el sistema valida el monto en ese rango antes de permitir el envío, tanto en la app como
   al orquestar el pago en el servidor. Montos fuera de rango se bloquean antes de confirmar, con mensaje
   claro. El campo de captura no acepta valores menores a S/ 0.01 (piso técnico de entrada, independiente del
   mínimo de negocio de S/ 10). La configuración de límites por proveedor/canal sigue como pregunta abierta.
3. **CA3 — Resultado único terminal** (T5): el pagador obtiene un único resultado terminal por intento
   (Exitoso, Fallido o Expirado), con referencia (el `id` del pago devuelto por el backend), fecha, destino y
   monto. El contrato de backend solo expone un `receiptId` propio a través de `GET /payments/{id}/receipt`,
   endpoint que queda en backlog (ver T9); por eso la referencia visible en esta HU es el `id` del pago, no un
   `receiptId`. Mientras el backend lo resuelve, la app muestra el estado intermedio **"Procesando"** (ver
   CA2/T7).
4. **CA4 — Acción tras resultado no exitoso** (T5): si el pago es Fallido o Expirado, la pantalla de
   resultado ofrece la acción **Volver al inicio**. La acción **Reintentar** y la reutilización de
   `Idempotency-Key` quedan en backlog (ver **Fuera de alcance**).
5. **CA5 — Inclusión y accesibilidad** (T11, transversal a T1–T6): toda pantalla del flujo cumple los
   requisitos de inclusión listados más abajo (tamaños de texto y contraste, lenguaje simple, ayuda visible,
   compatibilidad con lector de pantalla, estado "En proceso" tranquilizador, catálogo de mensajes editable).

## Flujo de pantallas

### T1. Home
- Saludo "Bienvenido, {Usuario}".
- Saldo disponible, obtenido con `GET /wallets/{id}`.
- Una acción principal y grande: **Nuevo pago** (el botón "Ver historial" queda en backlog, ver **Fuera de
  alcance**).

### T2. Selección de contacto
- Lista de contactos con nombre y alias enmascarado, con búsqueda simple.
- El mock solo expone contact-demo y merchant-demo: se necesita que el front mapee a esos IDs a través de un archivo de configuración. Según el contrato, ambos destinatarios admiten pago directo (sin qrId).
- El flujo de pago iniciado por escaneo de QR (parámetro opcional `qrId` del contrato, con sus errores propios
  `410 QR_EXPIRED` y `409 QR_PAYMENT_MISMATCH`) queda fuera de esta HU; esta pantalla solo cubre selección
  directa de contacto de la lista, no lectura de QR.

### T3. Datos del pago
- Origen: wallet del usuario autenticado, solo lectura (`wallet-demo`).
- Destino: el contacto elegido en T2.
- Monto en soles, con teclado numérico; se convierte a céntimos antes de enviarlo al backend.

### T4. Confirmación previa (CA1)
- Resumen en texto simple (p. ej. "Vas a pagar S/ 15.00 a Juan Pérez") con botones **Confirmar** y
  **Corregir**.

### T5. Pantalla de resultado (CA2/CA3/CA4)
- Un único estado terminal por intento: Exitoso, Fallido o Expirado.
- Estado intermedio **"Procesando"** mientras se resuelve.
- Datos mostrados: referencia (el `id` del pago, ver nota de CA3 sobre `receiptId`), fecha, destino y monto.
- Acción: **Volver al inicio**


## Integración y reglas

### T7. Orquestación del pago (CA2/CA3)
- Bloquear el botón de confirmar mientras se procesa, para evitar envíos duplicados por doble toque.
- Tras `POST /payments` (`202 PENDING`), hacer *polling* de `GET /payments/{id}` hasta llegar a un estado
  terminal, con un tiempo máximo propio de la app que produzca "Expirado" si el backend no resuelve a tiempo.
  El contrato de backend no expone un endpoint de resolución forzada (`POST /payments/{id}/resolve` no existe
  en este contrato); la resolución en el entorno de pruebas se hace por canales de control (`POST
  /callbacks/payments`, `POST /control/provider/{id}/complete`) que son herramientas de mock, no parte del
  flujo de producción de esta app.
- `Idempotency-Key` es un header obligatorio en cada `POST /payments` (1–200 caracteres, único por wallet): la
  app debe generarlo para el único intento en alcance de esta HU. Lo que queda en backlog es exclusivamente la
  *reutilización* de esa clave para reintentos (ver **Fuera de alcance**), no su generación para el envío
  inicial.
- Mapear errores: `409` (`INSUFFICIENT_FUNDS`, `WALLET_NOT_ACTIVE`), `400`, `404`, `413` y `429` como fallos
  claros antes o durante el envío.
- Caso especial `504 TIMEOUT_AFTER_PROCESSING`: el contrato indica que, aunque la respuesta sea `504`, el pago
  ya fue creado y el proveedor ya lo aprobó. La app no debe mostrar "Expirado" ni "Fallido" directamente ante
  un `504`; debe continuar el *polling* de `GET /payments/{id}` para reflejar el estado real antes de declarar
  un resultado terminal.
- Caso especial `503 PROVIDER_ERROR`: a diferencia del `504`, en este caso el backend confirma que no se creó
  operación ni reserva, por lo que sí corresponde un resultado terminal de tipo Fallido.
- Nota técnica de mapeo de campos: el cuerpo de `POST /payments` usa camelCase (`walletId`, `amountCents`),
  mientras que las respuestas de `POST /payments`, `GET /payments` y `GET /payments/{id}` usan snake_case
  (`wallet_id`, `amount`, etc.); la capa de integración del front debe normalizar esta asimetría.

### T8. Regla de monto bajo y límites
- Configuración por proveedor/canal: pregunta abierta de la historia, aún sin cerrar.
- Validación previa con mensaje claro; mínimo técnico de captura S/ 0.01 (distinto del mínimo de negocio de
  bajo monto, S/ 10).

### T9. Comprobante y persistencia — Diferido a backlog
- El comprobante (`GET /payments/{id}/receipt`) y la persistencia del registro exitoso en el historial de
  pagos quedan en backlog; ver **Fuera de alcance**.

### T10. Instrumentación — Diferido a backlog
- Los eventos `checkout_started`, `payment_confirmed`, `payment_result` y `checkout_abandoned`, el evento de
  activación y la métrica de caída en checkout quedan en backlog; ver **Fuera de alcance**.

## Inclusión (transversal a T1–T6)

### T11. Requisitos de inclusión
- Texto ≥ 18 px y contraste WCAG AA.
- Botones grandes (≥ 48 px).
- Un objetivo por pantalla y lenguaje sin jerga. Ejemplos: "Tu pago se hizo" y "No se hizo el pago, tu dinero
  está a salvo".
- Íconos junto a texto, nunca solos.
- Confirmación explícita antes de pagar (T4).
- Ayuda visible en cada pantalla ("¿Necesitas ayuda?").
- Compatibilidad con lector de pantalla.
- Estado "En proceso" con mensaje tranquilizador y sin perder el intento si se cierra la app.
- Catálogo de mensajes centralizado y editable, porque las etiquetas finales están pendientes con producto.

## Pruebas y datos de prueba

### T12
- Escenarios del mock: `APPROVED`, `REJECTED`, `PENDING`, `DELAYED_APPROVAL`, `TIMEOUT_AFTER_PROCESSING`,
  `PROVIDER_ERROR`.
- Saldo insuficiente.
- Doble toque (validar que el botón de confirmar permanece bloqueado mientras se procesa; la validación por
  `Idempotency-Key` queda en backlog).
- Pruebas de usabilidad con usuarios no nativos digitales.

## Endpoints referenciados

| Endpoint | Uso | Tarea |
|---|---|---|
| `GET /wallets/{id}` | Saldo disponible en Home | T1 |
| `POST /payments` | Inicia el pago (`202 PENDING`), requiere header `Idempotency-Key` | T7 |
| `GET /payments/{id}` | *Polling* de estado hasta resultado terminal (incluye el caso `504`, ver T7) | T7 |

No existe en el contrato un endpoint de resolución forzada para producción (ver **Contexto**).

Diferidos a backlog (ver **Fuera de alcance**): `GET /payments?walletId=` (historial, T6) y
`GET /payments/{id}/receipt` (comprobante, T9).

## Contexto

- El historial de pagos del pagador ya existe como funcionalidad separada; la integración de esta HU con él
  (agregar/persistir el registro de la transacción exitosa) queda en backlog, ver **Fuera de alcance**.
- La capa de contactos es un mock local necesario porque el mock de backend solo expone `contact-demo` y
  `merchant-demo` (T2).
- Esta HU no está vinculada formalmente a la épica "MVP de wallet en Perú". Esa épica incluye en su alcance
  general la instrumentación del funnel de checkout y el cobro con QR para comercios; ambos temas quedan
  fuera de esta HU porque se resuelven en otras historias de usuario de esa épica (ver **Fuera de alcance**).
- El contrato de backend (mock) usado como referencia para esta HU no incluye un endpoint de resolución
  forzada de pagos (`POST /payments/{id}/resolve`); la única forma de conocer el estado terminal en producción
  es el *polling* de `GET /payments/{id}` (T7). Los endpoints `GET /control/events`, `POST
  /callbacks/payments` y `POST /control/provider/{id}/complete` existen solo para preparar escenarios de
  prueba del mock y no forman parte del flujo de la app.

## Supuestos

- Monto mínimo de negocio para "bajo monto": S/ 10. Monto máximo: S/ 1000. Piso técnico de captura: S/ 0.01.
- Las etiquetas visibles al usuario para los estados terminales (Exitoso/Fallido/Expirado) quedan por definir
  con producto; mientras tanto se usa un catálogo de mensajes centralizado y editable (T11).
- El origen del pago es siempre `wallet-demo` (solo lectura) y los contactos disponibles son `contact-demo` y
  `merchant-demo` (datos de mock), ambos con pago directo (sin `qrId`).
- El cuerpo de la petición `POST /payments` usa camelCase (`walletId`, `amountCents`, etc.) y las respuestas
  del backend (`POST /payments`, `GET /payments`, `GET /payments/{id}`) usan snake_case (`wallet_id`,
  `amount`, etc.); el front debe mapear entre ambas convenciones.

## Preguntas abiertas / pendientes

- Configuración final de límites de bajo monto por proveedor/canal (T8).
- Etiquetas finales de los estados terminales y contenido definitivo del catálogo de mensajes (T11).
- Tiempo máximo exacto que debe transcurrir en "Procesando" antes de declarar "Expirado" (T5/T7).

## Fuera de alcance

### Backlog (diferido de esta HU)

- **Reintentos** (antes CA4 parcial, T5/T7): botón **Reintentar** en la pantalla de resultado y toda la
  *reutilización* de `Idempotency-Key` entre intentos (reintentos de red y manejo del error
  `409 IDEMPOTENCY_CONFLICT`). La generación del `Idempotency-Key` para el único envío en alcance, la
  protección básica de doble toque mediante el bloqueo del botón de confirmar, y el manejo de `504
  TIMEOUT_AFTER_PROCESSING` continuando el *polling* (sin tratarlo como reintento) se mantienen en alcance
  (T7/T12).
- **QR** (contrato de backend, fuera de las HU candidatas de pagador): el parámetro opcional `qrId` de
  `POST /payments` y sus errores asociados (`410 QR_EXPIRED`, `409 QR_PAYMENT_MISMATCH`) no se implementan en
  esta HU; corresponden a la historia de cobro con QR para comercios de la épica.
- **Historial** (antes CA5, T6): acceso al historial de pagos desde esta HU — pantalla T6, botón "Ver
  historial" en Home (T1) y endpoint `GET /payments?walletId=`. El historial como funcionalidad separada ya
  existe en el producto; lo que se difiere es la integración de esta HU con él.
- **Comprobante y persistencia** (antes CA5, T9): endpoint `GET /payments/{id}/receipt` y la persistencia del
  registro de la transacción exitosa en el historial de pagos.
- **Instrumentación y activación** (antes CA6, T10): eventos `checkout_started`, `payment_confirmed`,
  `payment_result` y `checkout_abandoned`, el evento de activación deduplicado por `paymentId`, y la
  definición/validación de la métrica de caída en checkout con Producto/Analytics. La épica "MVP de wallet en
  Perú" sí incluye esta instrumentación en su alcance general, pero se cubre mediante una historia de usuario
  separada dentro de esa épica, no en esta HU.

### Otros puntos fuera de alcance

- Gestión real de contactos (alta, edición, eliminación); T2 solo consume un mock local de contactos de
  demostración.
- Cierre definitivo de la configuración de límites de bajo monto por proveedor/canal (T8).
- Contenido final de las etiquetas de los estados terminales y de los mensajes del catálogo (T11): se
  construye el mecanismo, no el copy definitivo.