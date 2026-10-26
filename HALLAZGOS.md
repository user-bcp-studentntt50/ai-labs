# Hallazgos

## Flujo y contrato observado de web (caracterización previa)

No existe `docs/ENDPOINTS.md`; lo siguiente describe únicamente lo que el
frontend envía y espera, no un contrato verificado con los servicios:

1. Las rutas `/` y desconocidas redirigen a `/login`; `/dashboard` carga el
   dashboard. Evidencia: `web/src/app/app.routes.ts:3-13`.
2. Al enviar el formulario, Login valida que usuario y contraseña no estén
   vacíos y envía `POST http://localhost:8080/auth/login` con
   `{ username, password, client: "angular-workshop" }` y timeout de 5 s.
   Del cuerpo de respuesta consume `data.token` y `data.user`.
   Evidencia: `web/src/app/login/login.component.ts:33-45`.
3. Si hay token, Login guarda `workshop_token`, `workshop_user` y
   `workshop_preferences` en `localStorage`, y navega a `/dashboard`.
   Evidencia: `web/src/app/login/login.component.ts:46-50`.
4. Dashboard lee el token y el usuario de `localStorage`. Sin token redirige a
   `/login`; con token envía
   `GET http://localhost:8000/api/tasks?owner=<username>` con el token guardado
   en la cabecera HTTP de autorización. Espera una lista en
   `response.data` y usa
   `status`, `priority`, `owner`, `title` y `description` en el procesamiento
   y la vista. Evidencia: `web/src/app/dashboard/dashboard.component.ts:36-54`,
   `web/src/app/dashboard/dashboard.component.html:19-26`.
5. Cerrar sesión elimina `workshop_token` y `workshop_user` del almacenamiento
   local y navega a `/login`; no se observa una llamada remota de logout.
   Evidencia: `web/src/app/dashboard/dashboard.component.ts:74-77`.

**Contrato acordado:** no consta en la documentación consultada. Las formas de
request/response anteriores son expectativas observadas en el consumidor.
**Riesgos pendientes:** no se verificaron los contratos ni la autorización del
servidor; en particular, no puede determinarse desde `web/` si el servidor
valida que el `owner` de la query coincida con la identidad del token.

## Estado tras implementación web

- Login conserva `POST /auth/login`, el body con `username`, `password` y
  `client`, el timeout de 5 s, y consume token/usuario. La llamada ahora vive
  en `AuthService`; el servicio de sesión guarda token y usuario en
  `sessionStorage`, mantiene preferencias en `localStorage` y Login navega a
  `/dashboard`. Evidencia actual: `web/src/app/auth.service.ts:10-14`,
  `web/src/app/login/login.component.ts:33-63`,
  `web/src/app/session.service.ts:18-24,49-67`,
  `web/src/environments/environment.ts:1-4`.
- Dashboard conserva `GET /api/tasks?owner=...` y la cabecera Authorization,
  filtra tareas archivadas, conserva el orden alfabético descendente por
  prioridad y mantiene el logout local. Evidencia actual:
  `web/src/app/tasks.service.ts:11-18`,
  `web/src/app/dashboard/dashboard.component.ts:44-78`.
- Los tests ejercitan contratos con servicios HTTP mockeados; no se verificó
  conectividad ni autenticación contra los servicios reales.

## Matriz de seguimiento

| id | componente | hallazgo | tipo | explicacion | evidencia (archivo:linea) | severidad | estado |
|---|---|---|---|---|---|---|---|
| H-WEB-01 | web | Token de sesión guardado en `localStorage` | Vulnerabilidad | El riesgo de persistencia se mitigó moviendo token y usuario a `sessionStorage`, que se elimina al finalizar la sesión de pestaña. Sigue siendo accesible a JavaScript del mismo origen; una cookie `HttpOnly` requiere backend y queda pendiente como mitigación más sólida. | `web/src/app/session.service.ts:18-24,44-46`; prueba `web/src/app/services.spec.ts:85-100` | media | Resuelto — almacenamiento acotado a la pestaña; riesgo XSS residual documentado. |
| H-WEB-02 | web | `owner` de tareas se obtiene del usuario guardado en el navegador | Sugerencia | El usuario sigue controlando el valor de `owner` enviado por el cliente. La query se codifica correctamente, pero no se puede confirmar desde web si el servidor liga ese filtro a la identidad autenticada; no se cambió el contrato ni se declara corregida la autorización. | `web/src/app/dashboard/dashboard.component.ts:45-53`; `web/src/app/tasks.service.ts:11-18`; prueba `web/src/app/services.spec.ts:59-70` (solo request simulado; no verifica autorización) | media | Pendiente — por decisión del usuario se excluyen cambios backend y se eligió documentar solamente; la autorización por identidad sigue sin verificarse y no puede resolverse desde web sin cambiar el contrato. |
| H-WEB-03 | web | Componentes acoplan HTTP, sesión, lógica de pantalla y navegación | Refactor | Las llamadas HTTP ahora están en `AuthService` y `TasksService`; lectura/escritura de sesión y preferencias está centralizada en `SessionService`. Los componentes conservan el estado de pantalla y la navegación. | `web/src/app/auth.service.ts:8-15`; `web/src/app/tasks.service.ts:8-19`; `web/src/app/session.service.ts:15-68`; `web/src/app/login/login.component.ts:33-64`; `web/src/app/dashboard/dashboard.component.ts:44-78` | media | Resuelto — servicios separan transporte y persistencia. |
| H-WEB-04 | web | Mensaje dinámico renderizado con `[innerHTML]` | Refactor | El binding `[innerHTML]` se reemplazó con interpolación de texto; el error de autenticación es genérico y no incorpora usuario ni detalle interno del backend. | `web/src/app/login/login.component.html:39`; `web/src/app/login/login.component.ts:61-64`; prueba `web/src/app/auth-flow.spec.ts:123-140` | baja | Resuelto — texto interpolado y error genérico. |
| H-WEB-05 | web | Uso extendido de `any` y validación anidada | Refactor | Se añadieron tipos explícitos para request, respuesta, usuario, preferencias y tareas; se reemplazó la validación anidada por retornos anticipados y el formateador acepta una tarea tipada. | `web/src/app/models/auth.models.ts:1-22`; `web/src/app/models/task.model.ts:1-9`; `web/src/app/login/login.component.ts:16-64`; `web/src/app/dashboard/dashboard.component.ts:23-78`; `web/src/app/utils/legacy-format.ts:1-12` | baja | Resuelto — tipado explícito y guard clauses. |
| H-WEB-06 | web | Versiones de `axios` y `lodash` requieren revisión de advisories | Sugerencia | La auditoría inicial reportó advisories altos para ambas dependencias; se sustituyeron sus usos por `HttpClient` y merge tipado, y se retiraron `axios`, `lodash` y `@types/lodash` del manifiesto/lockfile. La auditoría posterior ya no las reporta, pero continúa fallando por 23 vulnerabilidades de otras dependencias (10 moderadas, 7 altas y 6 críticas). | `web/package.json:12-31`; `web/package-lock.json:8-31`; `web/src/app/auth.service.ts:1-15`; `web/src/app/tasks.service.ts:1-20`; `web/src/app/session.service.ts:49-67` | baja | Resuelto — paquetes señalados retirados; advisories restantes quedan como riesgo residual. |
| H-WEB-07 | web | Las pruebas visibles cubrían solo una utilidad | Refactor | Se agregaron pruebas de flujo de login, sesión, consulta/filtrado de tareas, logout, servicios HTTP, timeout y bootstrap. La última ejecución aprobó 25 pruebas; cobertura global 92.9% y todos los archivos ejecutables modificados tienen 100% de líneas cubiertas. | `web/src/app/auth-flow.spec.ts:1-233`; `web/src/app/services.spec.ts:1-171`; `web/src/main.spec.ts:1-46`; `web/src/app/utils/legacy-format.spec.ts:1-16` | baja | Resuelto — caracterización y regresión con cobertura superior al 85%. |
