## Tareas


**Flujo y pantallas**


- **T1. Home:** saludo "Bienvenido, {Usuario}", saldo disponible (`GET /wallets/{id}`) y dos acciones grandes: "Nuevo pago" y "Ver historial".
- **T2. Selección de contacto:** lista de contactos con nombre y alias enmascarado, con búsqueda simple. El mock solo tiene `contact-demo` y `merchant-demo`, así que se necesita una capa de contactos (mock local) que mapee a esos IDs.
- **T3. Datos del pago:** origen = wallet del usuario (solo lectura, `wallet-demo`), destino = contacto elegido, monto en soles con teclado numérico. Convertir a céntimos antes de enviar.
- **T4. Confirmación previa (CA1):** resumen en texto simple ("Vas a pagar S/ 15.00 a Juan Pérez") con botones "Confirmar" y "Corregir". El draft no la tiene y debe agregarse.
- **T5. Pantalla de resultado (CA2/CA3):** un único estado terminal (Exitoso, Fallido o Expirado), referencia (`receiptId`), fecha, destino y monto, con acciones "Reintentar" y "Volver al inicio". Falta ver el estado intermedio "Procesando".
- **T6. Historial (CA3):** lista de `GET /payments?walletId=` con estado en lenguaje simple y detalle con comprobante.


**Integración y reglas**


- **T7. Orquestación del pago (CA2/CA4):**
  - Generar una `Idempotency-Key` por intento y reutilizarla en los reintentos de red.
  - Bloquear el botón mientras se procesa.
  - Tras `POST /payments` (202 `PENDING`), consultar `GET /payments/{id}` o `POST /payments/{id}/resolve` hasta estado terminal, con tiempo máximo propio que produzca "Expirado".
  - Ante un 504 consultar por `paymentId` y no reintentar con otra clave.
  - Mapear los errores: 409 (`INSUFFICIENT_FUNDS`, `WALLET_NOT_ACTIVE`, `IDEMPOTENCY_CONFLICT`), 503 y 429.
- **T8. Regla de monto bajo y límites:** configuración por proveedor/canal (pregunta abierta de la historia), validación previa con mensaje claro y mínimo S/ 0.01.
- **T9. Comprobante y persistencia:** `GET /payments/{id}/receipt` solo en estado exitoso. Enriquecer con fecha, nombre del destino y referencia legible.
- **T10. Instrumentación (CA5/CA6):** eventos `checkout_started`, `payment_confirmed`, `payment_result` y `checkout_abandoned`, más el evento de activación en pago exitoso, deduplicado por `paymentId`. Incluir una definición de la métrica de caída en checkout.


**Inclusión (transversal a T1–T6)**


- **T11. Requisitos de inclusión:**
  - Texto ≥ 18 px y contraste WCAG AA.
  - Botones grandes (≥ 48 px).
  - Un objetivo por pantalla y lenguaje sin jerga. Ejemplos: "Tu pago se hizo" y "No se hizo el pago, tu dinero está a salvo".
  - Íconos junto a texto, nunca solos.
  - Confirmación explícita antes de pagar.
  - Ayuda visible en cada pantalla ("¿Necesitas ayuda?").
  - Compatibilidad con lector de pantalla.
  - Estado "En proceso" con mensaje tranquilizador y sin perder el intento si se cierra la app.
  - Catálogo de mensajes centralizado y editable, porque las etiquetas finales están pendientes con producto.
- **T12. Pruebas y datos de prueba:** escenarios con `scenario` del mock (`APPROVED`, `REJECTED`, `PENDING`, `DELAYED_APPROVAL`, `TIMEOUT_AFTER_PROCESSING`, `PROVIDER_ERROR`), saldo insuficiente, doble toque, y pruebas de usabilidad con usuarios no nativos.


## Fuera de alcance de este change


- Onboarding y KYC.
- Cobro con QR para comercios.
- Conciliación y operaciones.
- Autenticación real (PIN o biometría). Se propone como supuesto o change aparte.