# Evidencia de pruebas — componente web

## Alcance y contrato de referencia

Se probaron los flujos que el frontend observa para login y consulta de tareas
según [ENDPOINTS.md](./ENDPOINTS.md). Los casos usan servicios simulados:
verifican la reacción de la UI y los requests esperados, pero no prueban
conectividad ni respuestas de servicios reales. Los ejemplos y resultados
esperados respetan el contrato observado, no un contrato backend confirmado.

## Matriz de casos

| Flujo | Caso | Tipo | Resultado esperado |
|---|---|---|---|
| Login → sesión → tareas | Credenciales válidas y respuesta con token/usuario; luego cargar tareas | Camino feliz | Se guarda token y usuario en `sessionStorage`, se navega al dashboard y se consultan tareas con usuario y Bearer token; la lista visible se presenta y termina la carga. |
| Login | Usuario vacío o compuesto solo por espacios | Borde | Muestra `Ingrese un usuario.`; no invoca el servicio de autenticación. |
| Login | Contraseña vacía | Borde | Muestra `Ingrese una contraseña.`; no invoca el servicio de autenticación. |
| Login | Respuesta exitosa sin token | Borde / respuesta inesperada | Muestra `El backend respondió sin token.`, no guarda sesión ni navega. |
| Login | Servicio de autenticación no disponible (HTTP 503) | Error | Muestra el mensaje genérico de autenticación, no revela detalles y restablece `busy`. |
| Login | Timeout del servicio de autenticación | Error | A 5 segundos `AuthService` rechaza la petición; la UI muestra el mismo mensaje genérico y restablece `busy`. |
| Login | HTTP 401 / credenciales rechazadas | Error | Muestra el mensaje genérico, sin reflejar usuario ni detalle del servidor. |
| Dashboard | Sin token de sesión | Borde | Navega a `/login`; no solicita tareas. |
| Dashboard | Respuesta HTTP 401 por token inválido | Error | Muestra el error genérico y detiene la carga. El comportamiento observado no borra la sesión ni redirige automáticamente. |
| Dashboard | Otro error HTTP (HTTP 500) | Error | Muestra el mismo error genérico y detiene la carga; no expone detalle interno. |
| Dashboard | Cuerpo 2xx inesperado (`null` en la simulación) | Error / respuesta inesperada | La UI establece error y termina carga; el error de procesamiento se relanza, no se transforma en éxito. |
| Dashboard | Fallo inesperado no HTTP | Error | Establece error y termina carga, y relanza el fallo inesperado. |
| Tareas | Valor `owner` con `+` | Borde | El query codifica el valor (`student%2Btest`) y conserva la cabecera Bearer. |
| Dashboard | Prioridades y tarea archivada | Regla de flujo | Se excluye `ARCHIVED`; se generan etiquetas y se ordenan las tareas visibles según la implementación. |

Los casos automatizados están en
[auth-flow.spec.ts](../web/src/app/auth-flow.spec.ts) y
[services.spec.ts](../web/src/app/services.spec.ts). Las pruebas de servicio
comprueban específicamente que el operador RxJS de autenticación rechaza una
petición que supera el timeout configurado.

## Código de los tests de flujo

Los siguientes extractos corresponden al código ejecutable de
[auth-flow.spec.ts](../web/src/app/auth-flow.spec.ts); las líneas no copiadas
permanecen en ese archivo.

### Camino feliz combinado: login y carga de tareas

```ts
it('logs in and then loads tasks with the saved session', async () => {
  const session = new SessionService();
  const authService = createAuthService();
  vi.mocked(authService.login).mockResolvedValue({
    token: 'test-token',
    user: { username: 'student' }
  });
  const login = new LoginComponent(createRouter(), authService, session);
  login.username = 'student';
  login.password = 'Workshop123!';

  await login.login();

  const tasksService = {
    getTasks: vi.fn().mockResolvedValue([
      { id: 1, owner: 'student', priority: 'HIGH', status: 'TODO' }
    ])
  };
  const { component: dashboard } = createDashboard(tasksService, session);

  await dashboard.ngOnInit();

  expect(tasksService.getTasks).toHaveBeenCalledWith('student', 'test-token');
  expect(dashboard.visibleTasks.map((task) => task.id)).toEqual([1]);
  expect(dashboard.loading).toBe(false);
});
```

### Bordes de entrada y respuesta sin token

```ts
it('shows validation messages and does not authenticate empty credentials', async () => {
  const authService = createAuthService();
  const component = new LoginComponent(createRouter(), authService, new SessionService());

  component.username = '  ';
  await component.login();
  expect(component.message).toBe('Ingrese un usuario.');

  component.username = 'student';
  component.password = '';
  await component.login();
  expect(component.message).toBe('Ingrese una contraseña.');
  expect(authService.login).not.toHaveBeenCalled();
});

it('reports a login response without a token', async () => {
  const authService = createAuthService();
  vi.mocked(authService.login).mockResolvedValue({
    user: { username: 'student' }
  } satisfies LoginResponse);
  const component = new LoginComponent(createRouter(), authService, new SessionService());
  component.username = 'student';
  component.password = 'Workshop123!';

  await component.login();

  expect(component.message).toBe('El backend respondió sin token.');
  expect(component.busy).toBe(false);
  expect(sessionStorage.getItem('workshop_token')).toBeNull();
});
```

### Servicio no disponible y timeout de login

```ts
it('shows the generic login error when the authentication service is unavailable', async () => {
  const authService = createAuthService();
  vi.mocked(authService.login).mockRejectedValue(
    new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' })
  );
  const component = new LoginComponent(createRouter(), authService, new SessionService());
  component.username = 'student';
  component.password = 'Workshop123!';

  await component.login();

  expect(component.message).toBe(
    'No se pudo autenticar. Verifica las credenciales e inténtalo nuevamente.'
  );
  expect(component.busy).toBe(false);
  expect(sessionStorage.getItem('workshop_token')).toBeNull();
});

it('shows the generic login error when authentication times out', async () => {
  const authService = createAuthService();
  vi.mocked(authService.login).mockRejectedValue(new TimeoutError());
  const component = new LoginComponent(createRouter(), authService, new SessionService());
  component.username = 'student';
  component.password = 'Workshop123!';

  await component.login();

  expect(component.message).toBe(
    'No se pudo autenticar. Verifica las credenciales e inténtalo nuevamente.'
  );
  expect(component.busy).toBe(false);
  expect(sessionStorage.getItem('workshop_token')).toBeNull();
});
```

El timeout real de `AuthService` también se prueba con un observable que no
emite, temporizadores falsos y el valor `REQUEST_TIMEOUT_MS` en
[`services.spec.ts`](../web/src/app/services.spec.ts#L32).

### Token inválido en la consulta de tareas

```ts
it('shows a generic task error when the server rejects an invalid token', async () => {
  sessionStorage.setItem('workshop_token', 'invalid-token');
  sessionStorage.setItem('workshop_user', JSON.stringify({ username: 'student' }));
  const tasksService = {
    getTasks: vi.fn().mockRejectedValue(
      new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })
    )
  };
  const { component, router } = createDashboard(tasksService);

  await component.ngOnInit();

  expect(component.error).toBe('No se pudieron cargar las tareas. Intenta nuevamente.');
  expect(component.loading).toBe(false);
  expect(sessionStorage.getItem('workshop_token')).toBe('invalid-token');
  expect(router.navigate).not.toHaveBeenCalled();
});
```

## Ejecuciones y resultados

| Componente / IDs | Comando | Directorio de ejecución | Código de salida | Resultado |
|---|---|---|---:|---|
| web — H-WEB-01 a H-WEB-07 | `npm run test:coverage` | `web/` | 0 | Aprobado: 4 archivos de pruebas, 30 pruebas aprobadas, 0 fallidas. Ejecutado el 2026-10-26; duración reportada por Vitest: 1.17 s. |
| web — H-WEB-01 a H-WEB-07 | `git diff --check` | raíz `ai-labs/` | 0 | Aprobado: sin errores de whitespace detectados. |

## Cobertura

Método: cobertura de líneas instrumentada por V8 mediante Vitest
(`vitest run --coverage`); numerador y denominador se tomaron del
`web/coverage/coverage-summary.json` generado por la ejecución anterior.

| Medición | Líneas cubiertas / líneas ejecutables | Porcentaje |
|---|---:|---:|
| Código de producción del flujo login/sesión/tareas: `auth.service.ts`, `session.service.ts`, `tasks.service.ts`, `api.config.ts`, `login.component.ts`, `dashboard.component.ts`, `request-error.ts` y `environment.ts` | 246 / 246 | 100% |
| Global del componente web, todos los archivos incluidos por la configuración de cobertura | 275 / 296 | 92.9% |

En esta actualización solo se añadieron/ajustaron pruebas en
`web/src/app/auth-flow.spec.ts`; el código de pruebas no se cuenta como código
de producción cubierto. La cifra de 246/246 corresponde al conjunto ejecutable
del flujo ejercitado, no a una medición diferencial de las líneas modificadas.
Los modelos TypeScript sin instrucciones ejecutables no añaden líneas al
denominador.

## Fallos

- Ningún fallo de la suite completa en la ejecución registrada.
- No se afirma que se hayan ejecutado requests contra servicios reales.

## Pendientes

- No se probaron credenciales ni tokens con servicios activos; las respuestas
  HTTP fueron simuladas.
- `TasksService` no configura timeout específico. No se inventa una expectativa
  de timeout para tareas; el comportamiento de una petición que nunca responde
  queda pendiente de una decisión de contrato.
- El test de HTTP 401 demuestra la reacción de la UI al rechazo recibido; no
  demuestra las reglas de autenticación/autorización del servidor.

## Pruebas propuestas

- Ejecutar la aplicación con los servicios locales disponibles y comprobar
  login válido, credenciales rechazadas y carga de tareas usando los datos de
  laboratorio del README.
- Acordar si las tareas deben tener un timeout de aplicación y, solo entonces,
  añadir una prueba con límite y reacción de UI para ese contrato.

## Documentos consultados

- `README.md`
- `RETO.md`
- `docs/GOOD_PRACTICES.md`
- `docs/ENDPOINTS.md`
- Código y pruebas de `web/` citados en esta evidencia.
