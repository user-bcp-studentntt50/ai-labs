# ReqFlow API — contrato observado

Este documento describe el comportamiento comprobable de la API FastAPI actual.
No existe una aprobación de contrato separada; los ejemplos ilustran los
campos y formatos del código, no una garantía de compatibilidad futura. La API
no ofrece un endpoint para emitir tokens. En los ejemplos, `API_TOKEN` debe
contener un token que la integración de autenticación ya haya proporcionado.
El autenticador actual decodifica el formato legacy
`Base64(username|role|expiration_epoch_seconds|secret)`; no se incluye ni
reproduce el valor secreto hardcodeado. Referencia:
`api/app/security.py:12-20`.

## Riesgos y preguntas abiertas

- **Autenticación:** la implementación actual acepta un token Base64 legacy,
  no un JWT firmado. Falta acordar la migración con el emisor y validar firma,
  issuer, audience y expiración. No usar este mecanismo en producción.
- **Autorización:** las rutas ligan el `owner` a la identidad del token y
  rechazan un propietario diferente, pero la identidad no es confiable mientras
  el token pueda falsificarse (H-API-01 y H-API-02 pendientes).
- **Archivos:** no hay allowlist de extensiones ni límite de tamaño y se usa el
  nombre enviado por el cliente para formar la ruta. La carga no debe
  considerarse segura; faltan la política acordada de extensiones/tamaño y la
  corrección de path traversal (H-API-04 pendiente).
- **Errores 500:** los produce el runtime cuando una excepción no está
  controlada. El ejemplo de texto indicado abajo corresponde al manejo por
  defecto de Starlette, no a un contrato de error definido por la API.
- **`storedAt`:** es la ruta construida por el proceso a partir de
  `WORKSHOP_UPLOAD_DIR` (por defecto `./uploads`) y el nombre del archivo; su
  valor depende del directorio de trabajo y de la configuración.

En las peticiones `curl`, `API_TOKEN` es una variable de entorno local, no un
valor que esta API emita:

```bash
export API_TOKEN='<token proporcionado por la integración de autenticación>'
```

## `GET /api/tasks`

### 1. Qué hace

Lista las tareas del usuario autenticado; puede recibirse `owner` para
confirmar que coincide con esa identidad.

### 2. Autenticación

Requerida en el header exacto `Authorization: Bearer <token>`. El código elimina
el prefijo `Bearer ` si está presente; la autenticación real sigue siendo el
mecanismo legacy descrito arriba.

### 3. Request

No recibe cuerpo.

| Campo/parámetro | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `Authorization` | Header string | Sí | `Bearer` seguido del token aceptado por el autenticador actual. |
| `owner` | Query string | No | Si se omite o está vacío, se usa el usuario del token. Si se envía, debe coincidir con esa identidad. |

Ejemplo completo:

```bash
curl -H "Authorization: Bearer ${API_TOKEN}" \
  "http://localhost:8000/api/tasks?owner=student"
```

### 4. Response exitosa

Estado **200**. La respuesta es un array; cada tarea tiene:

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | integer | Identificador SQLite de la tarea. |
| `title` | string | Título. |
| `description` | string | Descripción. |
| `status` | string | Estado almacenado. |
| `owner` | string | Propietario asociado a la identidad autenticada. |
| `priority` | string | Prioridad almacenada. |
| `createdAt` | string | Fecha y hora creadas por SQLite. |

Ejemplo (base de datos inicializada con las tareas semilla):

```json
[
  {
    "id": 1,
    "title": "Refactor login",
    "description": "Separar responsabilidades en frontend",
    "status": "TODO",
    "owner": "student",
    "priority": "HIGH",
    "createdAt": "2026-11-02 22:16:50"
  },
  {
    "id": 2,
    "title": "Review API",
    "description": "Revisar seguridad de endpoints",
    "status": "IN_PROGRESS",
    "owner": "student",
    "priority": "MEDIUM",
    "createdAt": "2026-11-02 22:16:50"
  }
]
```

La fecha del ejemplo es ilustrativa; SQLite genera `createdAt` al insertar.

### 5. Respuestas de error

| Estado | Cuándo ocurre | Ejemplo de cuerpo |
|---|---|---|
| **401** | Falta el token o el autenticador no puede aceptarlo. | `{"detail":"Invalid token"}` |
| **403** | `owner` identifica a alguien distinto del usuario del token. | `{"detail":"Access denied"}` |
| **500** | Una excepción no controlada, por ejemplo un fallo de SQLite. | Texto plano: `Internal Server Error` (respuesta por defecto del runtime; no es un contrato estable de la API). |

### 6. Notas de seguridad

El filtro de tareas usa la identidad del token, no un `owner` arbitrario. Aun
así, el token actual es falsificable y la autorización no debe considerarse
efectiva hasta resolver H-API-01/H-API-02.

## `POST /api/tasks`

### 1. Qué hace

Crea una tarea para el usuario autenticado y devuelve la tarea creada.

### 2. Autenticación

Requerida en el header exacto `Authorization: Bearer <token>`, con el mecanismo
legacy descrito en la introducción.

### 3. Request

El cuerpo JSON es obligatorio. Todos sus campos son opcionales; los campos
extra se ignoran.

| Campo/parámetro | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `Authorization` | Header string | Sí | `Bearer` seguido del token aceptado por el autenticador actual. |
| `title` | string | No | Título. Default: `""`. |
| `description` | string | No | Descripción. Default: `""`. |
| `status` | string | No | Estado. Default: `"TODO"`. |
| `priority` | string | No | Prioridad. Default: `"MEDIUM"`. |
| `owner` | string o null | No | Si se omite o es null, se usa el usuario del token. Si se indica otro usuario, la petición se rechaza. |

Ejemplo completo:

```bash
curl -X POST "http://localhost:8000/api/tasks" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Add tests",
    "description": "Improve coverage",
    "status": "TODO",
    "priority": "HIGH",
    "owner": "student"
  }'
```

### 4. Response exitosa

Estado **201**. El cuerpo es una tarea con los mismos campos descritos en
`GET /api/tasks`.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | integer | Identificador SQLite asignado. |
| `title` | string | Título persistido. |
| `description` | string | Descripción persistida. |
| `status` | string | Estado persistido. |
| `owner` | string | Propietario ligado a la identidad autenticada. |
| `priority` | string | Prioridad persistida. |
| `createdAt` | string | Fecha y hora creadas por SQLite. |

Ejemplo:

```json
{
  "id": 3,
  "title": "Add tests",
  "description": "Improve coverage",
  "status": "TODO",
  "owner": "student",
  "priority": "HIGH",
  "createdAt": "2026-11-02 22:16:50"
}
```

`id` y `createdAt` dependen del estado y momento de inserción de la base de
datos.

### 5. Respuestas de error

| Estado | Cuándo ocurre | Ejemplo de cuerpo |
|---|---|---|
| **401** | Falta el token o el autenticador no puede aceptarlo. | `{"detail":"Invalid token"}` |
| **403** | El campo `owner` solicita una identidad distinta. | `{"detail":"Access denied"}` |
| **422** | Falta el cuerpo JSON o un campo tiene un tipo que Pydantic no acepta. | `{"detail":"Invalid request"}` |
| **500** | Una excepción no controlada durante la persistencia. | Texto plano: `Internal Server Error` (runtime; formato no garantizado por la API). |

### 6. Notas de seguridad

El servicio asigna el propietario desde la identidad autenticada y rechaza un
`owner` explícito diferente. Esta protección depende del token legacy, que no
verifica una firma; no confiar en ella para aislar usuarios hasta resolver
H-API-01/H-API-02.

## `GET /api/summary`

### 1. Qué hace

Resume el número de tareas y su distribución por estado para el usuario
autenticado, incluyendo el conteo de tareas abiertas de prioridad alta.

### 2. Autenticación

Requerida en el header exacto `Authorization: Bearer <token>`, con el mecanismo
legacy descrito en la introducción.

### 3. Request

No recibe cuerpo.

| Campo/parámetro | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `Authorization` | Header string | Sí | `Bearer` seguido del token aceptado por el autenticador actual. |
| `owner` | Query string | No | Si se omite o está vacío, se usa el usuario del token. Si se envía, debe coincidir con esa identidad. |

Ejemplo completo:

```bash
curl -H "Authorization: Bearer ${API_TOKEN}" \
  "http://localhost:8000/api/summary?owner=student"
```

### 4. Response exitosa

Estado **200**.

| Campo | Tipo | Descripción |
|---|---|---|
| `owner` | string | Usuario cuyo conjunto de tareas se resumió. |
| `total` | integer | Número total de tareas del usuario. |
| `byStatus` | object de string a integer | Conteo de tareas agrupado por valor de estado. |
| `highPriorityOpen` | integer | Tareas con prioridad `HIGH` cuyo estado no es `DONE` ni `ARCHIVED`. |

Ejemplo:

```json
{
  "owner": "student",
  "total": 2,
  "byStatus": {
    "TODO": 1,
    "IN_PROGRESS": 1
  },
  "highPriorityOpen": 1
}
```

### 5. Respuestas de error

| Estado | Cuándo ocurre | Ejemplo de cuerpo |
|---|---|---|
| **401** | Falta el token o el autenticador no puede aceptarlo. | `{"detail":"Invalid token"}` |
| **403** | `owner` identifica a alguien distinto del usuario del token. | `{"detail":"Access denied"}` |
| **500** | Una excepción no controlada al consultar SQLite. | Texto plano: `Internal Server Error` (runtime; formato no garantizado por la API). |

### 6. Notas de seguridad

El parámetro `owner` no concede acceso a otra identidad: la ruta limita el
resumen al usuario del token. El token legacy es falsificable, por lo que la
identidad subyacente no es confiable hasta resolver H-API-01/H-API-02.

## `POST /api/requirements`

### 1. Qué hace

Recibe y guarda un archivo de requerimientos, y devuelve los metadatos de la
carga.

### 2. Autenticación

Requerida en el header exacto `Authorization: Bearer <token>`, con el mecanismo
legacy descrito en la introducción.

### 3. Request

El cuerpo es `multipart/form-data`.

| Campo/parámetro | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `Authorization` | Header string | Sí | `Bearer` seguido del token aceptado por el autenticador actual. |
| `file` | archivo multipart (`UploadFile`) | Sí | Archivo a guardar. El código no restringe extensión ni tamaño. |

Ejemplo completo:

```bash
curl -X POST "http://localhost:8000/api/requirements" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -F "file=@requirements.txt;type=text/plain"
```

### 4. Response exitosa

Estado **201**.

| Campo | Tipo | Descripción |
|---|---|---|
| `owner` | string | Usuario del token. |
| `fileName` | string | Nombre recibido del cliente. |
| `storedAt` | string | Ruta construida por el servicio bajo el directorio de carga configurado. |
| `size` | integer | Número de bytes leídos y escritos. |

Ejemplo para un archivo llamado `requirements.txt` con contenido
`Login must be accessible`, usando el directorio por defecto desde la raíz:

```json
{
  "owner": "student",
  "fileName": "requirements.txt",
  "storedAt": "uploads/requirements.txt",
  "size": 24
}
```

### 5. Respuestas de error

| Estado | Cuándo ocurre | Ejemplo de cuerpo |
|---|---|---|
| **401** | Falta el token o el autenticador no puede aceptarlo. | `{"detail":"Invalid token"}` |
| **422** | Falta el campo `file` o el cuerpo no es un multipart válido. | `{"detail":"Invalid request"}` |
| **500** | Una excepción no controlada al leer o escribir el archivo. | Texto plano: `Internal Server Error` (runtime; formato no garantizado por la API). |

Una ruta con error al escribir no se convierte en un 4xx específico. El código
no verifica contención ni limita tamaño.

### 6. Notas de seguridad

H-API-04 sigue pendiente: el servicio usa directamente el nombre aportado por
el cliente, lee todo el archivo en memoria y no valida extensión o tamaño. No
subir archivos no confiables ni tratar la ruta de almacenamiento como aislada
del resto del sistema.

## `GET /api/backend-health`

### 1. Qué hace

Consulta la disponibilidad del servicio de autenticación configurado y devuelve
el estado y cuerpo recibidos.

### 2. Autenticación

Requerida en el header exacto `Authorization: Bearer <token>`, con el mecanismo
legacy descrito en la introducción.

### 3. Request

No recibe query ni cuerpo.

| Campo/parámetro | Tipo | Obligatorio | Descripción |
|---|---|---:|---|
| `Authorization` | Header string | Sí | `Bearer` seguido del token aceptado por el autenticador actual. |

El servicio consultado se configura con `AUTH_HEALTH_URL`; si no se define,
utiliza `http://localhost:8080/q/health`. La URL no es un parámetro de esta ruta.

Ejemplo completo:

```bash
curl -H "Authorization: Bearer ${API_TOKEN}" \
  "http://localhost:8000/api/backend-health"
```

### 4. Response exitosa

Estado **200**.

| Campo | Tipo | Descripción |
|---|---|---|
| `requestedBy` | string | Usuario del token que solicitó el chequeo. |
| `status` | integer | Código HTTP upstream; vale `0` cuando la consulta falla con una excepción controlada. |
| `body` | string | Cuerpo upstream decodificado como UTF-8; ante una excepción controlada contiene el mensaje genérico indicado abajo. |

Ejemplo cuando el servicio upstream devuelve HTTP 200 y el cuerpo
`{"status":"UP"}`:

```json
{
  "requestedBy": "student",
  "status": 200,
  "body": "{\"status\":\"UP\"}"
}
```

Si hay un error HTTP de transporte o el cuerpo no se puede decodificar como
UTF-8, la ruta también responde HTTP **200**, con esta respuesta:

```json
{
  "requestedBy": "student",
  "status": 0,
  "body": "Authentication service unavailable"
}
```

Si el upstream responde, por ejemplo, con HTTP 503, la API devuelve HTTP 200
con `status: 503` y el cuerpo upstream decodificado.

### 5. Respuestas de error

| Estado | Cuándo ocurre | Ejemplo de cuerpo |
|---|---|---|
| **401** | Falta el token o el autenticador no puede aceptarlo. | `{"detail":"Invalid token"}` |
| **500** | Una excepción no controlada fuera de los errores upstream capturados. | Texto plano: `Internal Server Error` (runtime; formato no garantizado por la API). |

Un fallo de conectividad upstream no produce un HTTP 5xx de esta ruta: se
representa con estado HTTP 200 y `status: 0` en el cuerpo.

### 6. Notas de seguridad

La ruta utiliza `AUTH_HEALTH_URL` o el valor local predeterminado, y limita la
espera upstream a tres segundos. No toma una URL del request. La autenticación
sigue usando el token legacy no firmado; ver H-API-01.

## Referencias de implementación

- `GET /api/tasks`: `api/app/routes.py:38-45`,
  `api/app/schemas.py:24-33`, `api/app/services.py:27-35`.
- `POST /api/tasks`: `api/app/routes.py:47-54`,
  `api/app/schemas.py:14-22`, `api/app/services.py:39-54`.
- `GET /api/summary`: `api/app/routes.py:56-63`,
  `api/app/schemas.py:36-43`, `api/app/services.py:56-76`.
- `POST /api/requirements`: `api/app/routes.py:65-76`,
  `api/app/schemas.py:45-52`, `api/app/services.py:78-92`.
- `GET /api/backend-health`: `api/app/routes.py:78-85`,
  `api/app/schemas.py:54-59`, `api/app/services.py:95-115`.
- Autenticación y autorización: `api/app/security.py:12-28`.
- Configuración y respuesta genérica de validación:
  `api/app/main.py:18-21,45-63`.
- Casos comprobados: `api/tests/test_api.py:28-254`.
