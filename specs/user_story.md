# user_story.md

## Historia y criterios de aceptación

> **Alineación pendiente:** el brief recibido es **H-AUTH-05: “Restringir CORS de auth y revisar sus dependencias”** y no incluye criterios de aceptación detallados. La tarea solicita, en cambio, especificar una transferencia entre cuentas propias. Para no presentar decisiones nuevas como aprobadas, los criterios y el contrato de transferencia siguientes se marcan como **propuesta**. El equipo responsable debe confirmar si ambos temas pertenecen al mismo alcance.

**Como** cliente autenticado,  
**quiero** transferir un monto entre dos cuentas propias,  
**para** mover fondos de forma segura, consistente y sin ejecutar dos veces una misma solicitud.

### Criterios recibidos

No se proporcionó una lista formal de criterios de aceptación. El título del brief indica restringir CORS de auth y revisar sus dependencias, pero no especifica orígenes, rutas, dependencias ni comportamiento esperado.

### Criterios propuestos — transferencia

1. **Propiedad de las cuentas**  
   **Dado** un cliente autenticado y dos cuentas, **cuando** solicita una transferencia, **entonces** la API solo la procesa si ambas cuentas pertenecen a ese cliente.

2. **Cuentas distintas y activas**  
   **Dado** un origen y un destino, **cuando** son la misma cuenta o alguna no está activa, **entonces** la API rechaza la solicitud con un código de negocio estable y no modifica saldos.

3. **Fondos y moneda**  
   **Dado** un monto y una moneda, **cuando** el saldo disponible es insuficiente o la moneda no está soportada para la operación, **entonces** la API rechaza la solicitud y no modifica saldos.

4. **Límites**  
   **Dada** una transferencia que excede un límite aplicable, **cuando** se valida la operación, **entonces** la API la rechaza sin modificar saldos. La definición de límites queda pendiente.

5. **Atomicidad**  
   **Dada** una transferencia válida, **cuando** falla el débito, el crédito o su persistencia, **entonces** no queda aplicado solo uno de los dos movimientos.

6. **Idempotencia**  
   **Dada** una solicitud con `Idempotency-Key`, **cuando** se repite con la misma clave y el mismo contenido, **entonces** no se ejecuta una segunda transferencia y se devuelve el resultado original. Si la clave se reutiliza con contenido distinto, se rechaza.

7. **Formato monetario**  
   **Dada** una solicitud, **cuando** se valida el monto, **entonces** se recibe como string decimal y nunca como número de punto flotante.

8. **CORS de autenticación — propuesta, pendiente de alinear alcance**  
   **Dado** un origen no configurado, **cuando** intenta realizar una solicitud CORS a auth, **entonces** la API no lo incluye en `Access-Control-Allow-Origin`. Los orígenes permitidos deben configurarse explícitamente; no se debe usar `*` junto con credenciales.

9. **Dependencias de auth — propuesta, pendiente de definir**  
   **Dada** una revisión de dependencias de auth, **cuando** se apruebe el alcance de H-AUTH-05, **entonces** deberán documentarse las dependencias revisadas, sus versiones y las acciones acordadas. El brief no identifica dependencias concretas ni una política de actualización.

## Contrato de API — propuesta sujeta a aprobación

La ruta y el formato siguientes **no están definidos en el brief**. Se proponen para revisión y no deben considerarse un endpoint aprobado hasta confirmar el alcance de transferencia.

### Solicitud

- **Método y ruta propuestos:** `POST /api/v1/transfers`
- **Autenticación:** obligatoria. Mecanismo por confirmar; no se debe confiar en identificadores de cliente enviados en el cuerpo.
- **Cabeceras:**
  - `Authorization: Bearer <token>` — si se confirma autenticación Bearer.
  - `Content-Type: application/json`
  - `Idempotency-Key: <valor único>` — obligatorio; formato, longitud y periodo de retención por definir.
  - `Accept: application/json`
  - `Origin` — cuando la solicitud provenga de un navegador; CORS no reemplaza autenticación ni autorización.
- **Cuerpo propuesto:**
  - `sourceAccountId`: identificador opaco de la cuenta origen.
  - `destinationAccountId`: identificador opaco de la cuenta destino.
  - `amount`: string decimal positivo, sin exponente ni separadores de miles.
  - `currency`: código ISO 4217 de tres letras.

Ejemplo:

```json
{
  "sourceAccountId": "acct_example_001",
  "destinationAccountId": "acct_example_002",
  "amount": "25.40",
  "currency": "USD"
}
```

Los identificadores y datos del ejemplo son ficticios. La escala decimal admitida por moneda debe validarse con la regla acordada para ISO 4217; queda pendiente definir el tratamiento de monedas y escalas no admitidas.

### Respuesta exitosa propuesta

- **`201 Created`** al completar una transferencia nueva.
- Para un reintento idempotente con la misma clave y el mismo contenido: devolver el resultado original, sin una segunda ejecución. Si se conserva el código HTTP original o se devuelve otro código, debe confirmarse con el equipo API.

```json
{
  "transferId": "tr_example_001",
  "status": "COMPLETED",
  "sourceAccountId": "acct_example_001",
  "destinationAccountId": "acct_example_002",
  "amount": "25.40",
  "currency": "USD",
  "createdAt": "2026-01-15T12:00:00Z"
}
```

Los valores son ilustrativos, no resultados de pruebas.

### Errores y códigos de negocio estables propuestos

Formato común:

```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "No se pudo completar la transferencia.",
    "correlationId": "corr_example_001"
  }
}
```

`message` es informativo y no debe usarse como identificador de lógica cliente; `code` es el identificador estable. No incluir saldos, credenciales ni datos de otras cuentas. El formato y la política de exposición deben aprobarse con Security.

| Código estable propuesto | HTTP propuesto | Significado |
|---|---:|---|
| `INSUFFICIENT_FUNDS` | 422 | Saldo insuficiente. |
| `SAME_ACCOUNT` | 422 | Origen y destino son la misma cuenta. |
| `ACCOUNT_NOT_OWNED` | 403 | Al menos una cuenta no pertenece al cliente autenticado. La posibilidad de responder `404` para evitar enumeración requiere decisión de Security. |
| `ACCOUNT_INACTIVE` | 422 | Una cuenta no está activa. |
| `CURRENCY_NOT_SUPPORTED` | 422 | Moneda no admitida para la operación. |
| `LIMIT_EXCEEDED` | 422 | Se excede un límite aplicable; límites pendientes de definición. |
| `DUPLICATE_REQUEST` | 409 | Clave idempotente reutilizada con contenido distinto. Una repetición idéntica devuelve el resultado original, no este error. |

Otros estados HTTP propuestos: `400` para cuerpo inválido, `401` para autenticación ausente o inválida, `403` para operación no autorizada, `404` si se adopta ocultación de existencia, `409` para conflicto de idempotencia y `5xx` para fallo interno. El mapeo definitivo debe acordarse con API y Security. Para errores de CORS, el navegador puede impedir que el cliente lea la respuesta; no se promete que todos los errores CORS lleguen con este cuerpo JSON.

### Recorrido de la petición

1. **React** envía la solicitud autenticada, el cuerpo decimal y una `Idempotency-Key`. No calcula ni decide el saldo final.
2. **Adaptador de entrada REST** valida estructura y autenticación, y traduce la petición al caso de uso. La validación de forma no reemplaza las reglas del dominio.
3. **Caso de uso de aplicación** coordina la operación mediante puertos; no depende de detalles de React, HTTP ni persistencia.
4. **Dominio y puertos de salida** aplican las reglas aprobadas y solicitan lectura/escritura de cuentas, movimientos e idempotencia mediante interfaces.
5. **Adaptador de persistencia** implementa los puertos. La aplicación solicita que débito, crédito, movimiento e idempotencia se confirmen como una unidad atómica.
6. **Adaptador REST** traduce el resultado o error a HTTP y devuelve un `correlationId` para seguimiento.

### Ejemplo de error propuesto

Solicitud no ejecutada por saldo insuficiente:

```http
HTTP/1.1 422 Unprocessable Content
Content-Type: application/json
```

```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "No se pudo completar la transferencia.",
    "correlationId": "corr_example_002"
  }
}
```

## Reglas de negocio y estado de definición

La tarea pide considerar las reglas siguientes, pero el brief H-AUTH-05 no las especifica. Por ello, salvo la intención general de “cuentas propias” expresada en la tarea, son **propuestas pendientes de confirmación**:

- Ambas cuentas pertenecen al cliente autenticado.
- Origen y destino son distintos.
- Ambas cuentas están activas y admiten la operación.
- Hay saldo suficiente según la definición de saldo aplicable.
- La moneda es válida y está soportada; falta definir si origen y destino deben compartir moneda y cómo tratar conversiones.
- Se aplican límites; faltan monto, periodicidad, acumulación, zona horaria y comportamiento al alcanzarlos.
- Débito y crédito son atómicos; un fallo no deja una transferencia parcial.
- Deben definirse precisión, redondeo, escalas por moneda, comisiones y cualquier regla de saldo disponible/bloqueado antes de implementar.

## Componentes, límites y responsabilidades

- **Dominio (`domain/model/`):** entidades y reglas puras de transferencia. No importa infraestructura.
- **Puertos de entrada (`domain/port/input/`):** contratos de los casos de uso invocados desde el exterior.
- **Puertos de salida (`domain/port/output/`):** interfaces para cuentas, movimientos, idempotencia y límites, según se apruebe el modelo.
- **Aplicación (`application/service/`):** coordina el caso de uso, autorización de la operación recibida y transacción requerida a través de puertos; no contiene detalles de HTTP o almacenamiento.
- **Adaptador de entrada (`infrastructure/adapter/input/`):** controller REST, traducción HTTP, autenticación integrada y validación estructural.
- **Adaptadores de salida (`infrastructure/adapter/output/`):** repositorios y mecanismos de persistencia que implementan los puertos.
- **Configuración (`infrastructure/config/`):** ensamblado, CORS y propiedades. La configuración de CORS debe estar separada de las reglas de transferencia.
- **React:** presenta formularios y resultados; no es autoridad para propiedad, saldo, límites ni autorización.
- **Backend:** define y aplica el contrato y las reglas aprobadas. Si **Datos no está activo**, Backend cubre la persistencia necesaria. Si **Datos está activo**, Datos acuerda y revisa el modelo, restricciones, transacciones y operación de almacenamiento con Backend; la aplicación sigue dependiendo de puertos, no de Datos.
- **Security:** decide autenticación, autorización, enumeración de cuentas, CORS, manejo de secretos y datos sensibles.
- **Testing:** convierte cada criterio aprobado en verificaciones de contrato, casos de uso, persistencia y seguridad; no presupone resultados antes de ejecutar pruebas.
- **Chapter:** revisa alineación arquitectónica, estándares, contrato y decisiones pendientes.

## Requisitos no funcionales verificables — propuestas

- **Consistencia:** una transferencia completada presenta débito y crédito; una fallida no presenta solo uno. Verificarlo ante fallos de persistencia.
- **Idempotencia:** clave y resultado se conservan de forma durable durante un periodo acordado; reintentos idénticos no duplican movimientos. Definir retención y comportamiento tras expiración.
- **Concurrencia:** operaciones concurrentes no pueden gastar el mismo saldo disponible ni sobrepasar límites. Backend y Datos deben acordar y probar la estrategia de aislamiento/concurrencia.
- **Auditoría:** registrar identificador de transferencia, resultado y referencias necesarias para reconstrucción; no registrar tokens ni datos sensibles innecesarios. Definir retención y acceso.
- **Trazabilidad:** propagar un identificador de correlación desde entrada hasta persistencia y respuesta; comprobar su presencia en logs/trazas sin exponer secretos.
- **Observabilidad:** exponer métricas agregadas de éxito, rechazo y fallos, sin etiquetas con identificadores de cliente/cuenta; acordar umbrales y alertas.
- **Seguridad:** exigir autenticación y autorización en servidor, validar propiedad en cada operación, limitar exposición de errores y proteger claves idempotentes. Security debe aprobar el mecanismo y la política de enumeración.
- **CORS de auth:** lista explícita de orígenes, métodos y cabeceras requeridas; no reflejar orígenes arbitrarios ni combinar comodín con credenciales. Confirmar mecanismo de auth y si usa credenciales de navegador antes de fijar `Access-Control-Allow-Credentials`.

## Supuestos, preguntas abiertas y riesgos

- **Producto/PO:** confirmar si el alcance es transferencia, H-AUTH-05 de CORS/dependencias o ambos; aprobar reglas, límites, monedas y semántica de duplicados.
- **Backend/API:** aprobar ruta, autenticación, códigos HTTP, contrato de errores, formato y retención de idempotencia.
- **Security:** definir autenticación, autorización, política `403`/`404`, CORS permitido y revisión de dependencias.
- **Datos (si está activo) y Backend:** acordar persistencia atómica, concurrencia, auditoría y garantías de idempotencia. Confirmar quién opera cada componente.
- **Testing:** acordar los casos verificables y los escenarios de fallos una vez aprobadas las decisiones.
- **Riesgo de alcance:** implementar transferencia como si fuera parte confirmada de H-AUTH-05 podría producir un endpoint fuera del objetivo del feature.
- **Riesgo financiero:** moneda, saldo disponible, límites, comisiones o concurrencia sin definición podrían causar resultados inconsistentes o inesperados.
- **Riesgo de seguridad:** una respuesta que revele si una cuenta existe puede facilitar enumeración; requiere decisión de Security.
- **Riesgo de CORS:** CORS no sustituye controles de autenticación ni evita solicitudes no originadas por navegador.