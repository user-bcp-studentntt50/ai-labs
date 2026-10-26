# Contratos HTTP consumidos por web

Este documento describe lo que el frontend Angular configura, envía y procesa
para los dos endpoints externos de login y tareas. Es el contrato observado en
el consumidor; los servicios no se llamaron durante esta documentación, así que
los ejemplos son ficticios y basados en las pruebas locales, no respuestas
verificadas de servidores activos.

## `POST /auth/login`

### 1. Quién lo llama

El formulario de `LoginComponent` (`web/src/app/login/login.component.ts:34-59`)
valida que usuario y contraseña no estén vacíos y llama a `AuthService.login`
(`web/src/app/auth.service.ts:8-15`). La URL se compone en
`web/src/app/config/api.config.ts:3-8` usando
`web/src/environments/environment.ts:1-4`; en esta configuración local es
`http://localhost:8080/auth/login`. El servicio aplica un timeout de 5 segundos.

### 2. Qué envía

El servicio manda un cuerpo JSON de tipo `LoginRequest`
(`web/src/app/models/auth.models.ts:1-5`). No configura headers personalizados.
Angular `HttpClient` serializa el objeto de request como JSON.

| Parte | Campo | Tipo/valor observado | Origen |
|---|---|---|---|
| Método y ruta | — | `POST /auth/login` | `web/src/app/config/api.config.ts:3-4` |
| Header | `Content-Type` | `HttpClient` envía el objeto como JSON; la aplicación no fija manualmente este header | `web/src/app/auth.service.ts:11-14` |
| Header | Authorization | No se envía en login | `web/src/app/auth.service.ts:11-14` |
| Body | `username` | `string` | `web/src/app/models/auth.models.ts:1-5` |
| Body | `password` | `string` | `web/src/app/models/auth.models.ts:1-5` |
| Body | `client` | `string`; el frontend envía `angular-workshop` | `web/src/app/login/login.component.ts:10,48-51` |

Ejemplo ilustrativo con datos de prueba:

```http
POST http://localhost:8080/auth/login
Content-Type: application/json

{
  "username": "student",
  "password": "Workshop123!",
  "client": "angular-workshop"
}
```

Los valores de usuario/contraseña mostrados son los datos ficticios de las
pruebas locales (`web/src/app/services.spec.ts:18-24`), no credenciales
verificadas contra un servicio.

### 3. Qué espera recibir en éxito

`AuthService` tipa el cuerpo como `LoginResponse`
(`web/src/app/auth.service.ts:11-14`,
`web/src/app/models/auth.models.ts:7-17`). Angular considera exitosa una
respuesta HTTP 2xx; el código consumidor no exige un código concreto como 200.
El componente comprueba que `token` sea truthy antes de guardar la sesión
(`web/src/app/login/login.component.ts:52-59`).

| Campo | Tipo declarado | Uso observado |
|---|---|---|
| `token` | `string` opcional en el tipo TypeScript | Debe estar presente/no vacío para guardar sesión y navegar al dashboard |
| `user` | `AuthenticatedUser` | Usuario guardado junto con el token |
| `user.username` | `string` | Identidad usada luego en la consulta de tareas |
| `user.displayName` | `string` opcional | Nombre preferido en la cabecera del dashboard |
| `user.role` | `string` opcional | Declarado en el tipo; el flujo web revisado no lo usa |

Ejemplo ilustrativo basado en una respuesta simulada de las pruebas:

```json
{
  "token": "test-token",
  "user": {
    "username": "student",
    "displayName": "Workshop Student"
  }
}
```

El frontend consume directamente ese objeto como cuerpo de respuesta; no
desenvuelve una propiedad `data`. El test usa esta forma
(`web/src/app/auth-flow.spec.ts:61-65`). El código no valida en runtime la
estructura de `user`.

### 4. Reacción de la UI ante errores

| Caso | Reacción implementada |
|---|---|
| Usuario o contraseña vacíos | Validación local muestra `Ingrese un usuario.` o `Ingrese una contraseña.` y no envía la petición (`web/src/app/login/login.component.ts:35-46`). |
| Respuesta HTTP sin token | Muestra `El backend respondió sin token.`, no guarda la sesión ni navega (`web/src/app/login/login.component.ts:52-55`). |
| Error HTTP, incluidas credenciales rechazadas | `HttpErrorResponse` se convierte en el mensaje genérico `No se pudo autenticar. Verifica las credenciales e inténtalo nuevamente.`; no presenta el detalle del backend (`web/src/app/login/login.component.ts:60-64`). El estado `busy` se restablece en `finally`. |
| Timeout | El servicio limita la llamada a 5000 ms (`web/src/app/config/api.config.ts:8`, `web/src/app/auth.service.ts:11-14`). `TimeoutError` se clasifica como error de request y la UI presenta el mismo mensaje genérico (`web/src/app/utils/request-error.ts:1-5`, `web/src/app/login/login.component.ts:60-64`). |
| Respuesta 2xx con formato inesperado | El tipo TypeScript no valida el JSON en runtime. Si al leer la respuesta ocurre una excepción que no es error HTTP ni timeout, se vuelve a lanzar; `busy` se restablece, pero no se garantiza un mensaje de error en pantalla (`web/src/app/login/login.component.ts:52-64`). |
| Error inesperado de programación | Se vuelve a lanzar tras restablecer `busy`; no se convierte silenciosamente en éxito (`web/src/app/login/login.component.ts:60-66`). |

Un token malformado pero no vacío no se valida en login; se guarda y solo se
podría observar su rechazo en una petición posterior.

### 5. Notas de seguridad

- El mensaje se muestra mediante interpolación de texto, no con
  `[innerHTML]` (`web/src/app/login/login.component.html:39`).
- El manejo de sesión está centralizado en `SessionService`
  (`web/src/app/session.service.ts:15-46`): token y usuario se guardan en
  `sessionStorage`, no en `localStorage`. Las preferencias, que no son el token,
  sí usan `localStorage` (`web/src/app/session.service.ts:49-71`).
- `sessionStorage` limita la persistencia a la pestaña, pero sigue siendo
  accesible a JavaScript del mismo origen. El frontend no valida la firma,
  expiración ni claims del token.
- La aplicación no establece headers de seguridad adicionales en esta llamada.
  La URL configurada es HTTP localhost; no se documenta aquí una configuración
  TLS de un entorno desplegado.

## `GET /api/tasks`

### 1. Quién lo llama

`DashboardComponent.ngOnInit` obtiene el token y el usuario mediante
`SessionService`; si no hay token, navega a `/login` sin llamar al endpoint
(`web/src/app/dashboard/dashboard.component.ts:48-52`). Con token, llama a
`TasksService.getTasks` (`web/src/app/dashboard/dashboard.component.ts:54`).
La URL se compone en `web/src/app/config/api.config.ts:3-8` a partir de
`web/src/environments/environment.ts:1-4`; en la configuración local es
`http://localhost:8000/api/tasks`.

### 2. Qué envía

El servicio no envía body. Construye el query con `encodeURIComponent` y agrega
la cabecera Bearer (`web/src/app/tasks.service.ts:11-18`).

| Parte | Campo | Tipo/valor observado | Origen |
|---|---|---|---|
| Método y ruta | — | `GET /api/tasks` | `web/src/app/config/api.config.ts:3-5` |
| Query | `owner` | username guardado en la sesión; codificado para URL | `web/src/app/dashboard/dashboard.component.ts:49-55`, `web/src/app/tasks.service.ts:11-12` |
| Header | `Authorization` | `Bearer <token>` | `web/src/app/tasks.service.ts:13-17` |
| Body | — | No se envía | `web/src/app/tasks.service.ts:11-18` |

Ejemplo ilustrativo con datos ficticios de prueba:

```http
GET http://localhost:8000/api/tasks?owner=student
Authorization: Bearer test-token
```

Para un valor de usuario `student+test`, el query se codifica como
`owner=student%2Btest` (`web/src/app/services.spec.ts:66-75`).

### 3. Qué espera recibir en éxito

`TasksService` tipa el cuerpo directamente como `Task[]`
(`web/src/app/tasks.service.ts:11-18`,
`web/src/app/models/task.model.ts:1-9`). La aplicación espera una respuesta
HTTP 2xx, pero no comprueba un código de éxito específico.

| Campo por tarea | Tipo declarado | Uso observado |
|---|---|---|
| `id` | `number` o `string`, opcional | Identificador disponible en la tarea |
| `status` | `string` | Se usa para excluir `ARCHIVED` y mostrar una etiqueta |
| `owner` | `string`, opcional | Se usa para formar la etiqueta visible |
| `priority` | `string`, opcional | Se usa para formar la etiqueta y ordenar tareas |
| `title` | `string`, opcional | Se muestra en la tarjeta |
| `description` | `string`, opcional | Se muestra en la tarjeta |
| `label` | `string`, opcional en el modelo TypeScript | No se espera del endpoint; el dashboard genera esta etiqueta de presentación al procesar la tarea |

Ejemplo ilustrativo basado en las tareas simuladas en pruebas:

```json
[
  {
    "id": 1,
    "owner": "student",
    "priority": "LOW",
    "status": "TODO"
  },
  {
    "id": 2,
    "owner": "student",
    "priority": "HIGH",
    "status": "IN_PROGRESS"
  }
]
```

El dashboard filtra el estado `ARCHIVED`, genera la etiqueta de prioridad y
owner y ordena por prioridad en orden descendente
(`web/src/app/dashboard/dashboard.component.ts:78-83`). La forma se basa en las
pruebas de flujo (`web/src/app/auth-flow.spec.ts:164-168`); no se verificó
contra una respuesta real del servicio.

### 4. Reacción de la UI ante errores

| Caso | Reacción implementada |
|---|---|
| Falta token en la sesión | Redirige a `/login` y no solicita tareas (`web/src/app/dashboard/dashboard.component.ts:48-52`). |
| Token inválido/rechazado por el servidor (por ejemplo, HTTP 401) | Angular entrega un `HttpErrorResponse`; el dashboard muestra `No se pudieron cargar las tareas. Intenta nuevamente.` y termina el estado de carga (`web/src/app/dashboard/dashboard.component.ts:61-72`). No limpia automáticamente la sesión ni redirige a login. La condición exacta del servidor que causa 401 no está comprobada. |
| Otro error HTTP o de red | Muestra el mismo mensaje genérico y termina la carga; el detalle interno no se muestra (`web/src/app/dashboard/dashboard.component.ts:61-72`). |
| Timeout | `TasksService` no configura timeout. No hay un límite temporal explícito propio de este endpoint; el comportamiento de una petición que no finaliza depende de la capa HTTP/navegador. |
| Respuesta 2xx con cuerpo inesperado (por ejemplo, no es una lista) | El tipo `Task[]` no valida el cuerpo en runtime. Si el procesamiento falla, el dashboard primero establece el mensaje genérico y termina la carga; como el error no es `HttpErrorResponse` ni `TimeoutError`, lo vuelve a lanzar (`web/src/app/dashboard/dashboard.component.ts:61-72`). |
| Error inesperado de programación durante la petición/procesamiento | Establece el estado de error y finaliza la carga, y luego relanza el error; no lo oculta como resultado exitoso (`web/src/app/dashboard/dashboard.component.ts:61-72`). |

### 5. Notas de seguridad

- El token se centraliza en `SessionService` y se transmite como Bearer; el
  usuario que alimenta `owner` también proviene del almacenamiento del
  navegador (`web/src/app/session.service.ts:18-28`,
  `web/src/app/dashboard/dashboard.component.ts:48-55`).
- Codificar `owner` protege la estructura del query string, pero no autentica
  ni autoriza ese valor. No se puede confirmar desde el frontend si el backend
  vincula `owner` con la identidad del token; queda como pregunta pendiente
  (hallazgo H-WEB-02).
- La UI muestra los valores de tareas mediante interpolación Angular en la
  plantilla (`web/src/app/dashboard/dashboard.component.html:22-25`); no usa
  `[innerHTML]` para esos datos.
- No se observó un endpoint remoto de logout: cerrar sesión elimina token y
  usuario localmente y navega a `/login`
  (`web/src/app/dashboard/dashboard.component.ts:75-78`,
  `web/src/app/session.service.ts:44-46`).

## Preguntas abiertas

- ¿Qué códigos HTTP exactos devuelve cada servicio para éxito, credenciales
  inválidas, token inválido y errores de validación? El frontend solo distingue
  respuestas exitosas HTTP de errores HTTP; no define un catálogo de status.
- ¿Los servicios devuelven exactamente un objeto `LoginResponse` y una lista
  `Task[]`, o usan envoltorios adicionales? Esas son las formas que espera el
  consumidor, pero no se contrastaron con respuestas de los servidores.
- ¿Qué esquema y claims hacen válido un token y cómo debe reaccionar la UI ante
  su expiración/revocación? El frontend no valida token y no limpia la sesión
  ante un error de autorización de tareas.
- ¿El servidor de tareas verifica que `owner` coincida con la identidad
  autenticada? La autorización no puede establecerse desde el código web.
- ¿Qué comportamiento de timeout debe ofrecer tareas? El servicio web no
  configura uno explícito.
- ¿Qué comportamiento HTTP tiene un logout remoto? El flujo observado solo
  limpia la sesión local y no consume endpoint de logout.

## Documentos consultados

- `README.md`
- `RETO.md`
- `docs/GOOD_PRACTICES.md`
- `HALLAZGOS.md`
- `PLAN.md`
- Código y pruebas del componente `web/` citados en cada sección.
