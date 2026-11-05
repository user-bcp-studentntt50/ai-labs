# frontend_spec.md

## Estado

**H-AUTH-05 no requiere cambios de interfaz confirmados y queda bloqueada para integración.** La feature trata de restringir CORS de autenticación y revisar dependencias, pero no especifica orígenes permitidos, rutas de auth, política de credenciales, dependencias ni criterios de aceptación detallados. Tampoco se proporcionó el proyecto Angular ni su manifiesto de dependencias.

El historial menciona una transferencia entre cuentas propias, pero ese alcance y su contrato están marcados como propuestas pendientes de aprobación. No se implementa ni se asume que forme parte de H-AUTH-05.

## Responsabilidad del frontend

- CORS se configura en el servidor de autenticación. Angular no puede establecer `Access-Control-Allow-Origin` ni reemplazar la política del servidor.
- No usar `mode: 'no-cors'`, proxies improvisados ni otros mecanismos para eludir CORS.
- No se definen rutas, campos, mensajes de autenticación ni mecanismos de sesión: faltan el contrato de auth y las decisiones sobre tokens o cookies.
- No se pueden identificar ni actualizar dependencias sin el manifiesto real del proyecto.
- El archivo Angular incluido valida una URL base configurada explícitamente. **No implementa ni prueba la política CORS del servidor.**

## Recorrido y estados de interfaz

No se especifica un recorrido de autenticación que pueda implementarse sin inventar contrato. Cuando se aprueben las rutas y el flujo:

- Mantener un estado de carga visible y evitar envíos duplicados mientras haya una solicitud activa.
- Presentar los errores con mensajes accesibles, sin exponer tokens, credenciales ni detalles internos.
- Un error de red del navegador (por ejemplo, `status === 0`) puede deberse a CORS, conectividad u otras causas; mostrar un mensaje genérico y no atribuirlo exclusivamente a CORS.
- Conservar etiquetas accesibles, navegación por teclado y foco visible en los controles y mensajes.

## Criterios pendientes de aprobación

1. Lista explícita de orígenes permitidos y configuración por entorno.
2. Rutas de auth cubiertas, métodos, cabeceras, preflight y política de credenciales.
3. Mecanismo de autenticación y comportamiento esperado del cliente.
4. Manifiesto de dependencias, versiones actuales y política de actualización.
5. Contrato de errores y criterios de aceptación para los flujos de auth.

No se considera aprobado el uso de `*` con credenciales.

## Cómo comprobar el recorrido y sus errores

Con el contrato y el entorno de servidor aprobados:

1. Desde un origen permitido, comprobar en el navegador el flujo de auth y el preflight requerido.
2. Desde un origen no permitido, verificar que el servidor no lo autorice. El cliente puede mostrar un error de red genérico porque el navegador podría impedir que lea la respuesta.
3. Comprobar la política de credenciales con la configuración aprobada; no inferirla desde el cliente.
4. Probar carga, respuesta exitosa, error HTTP legible y fallo de red/CORS. Confirmar que no se envían solicitudes duplicadas y que los mensajes son accesibles.
5. Revisar y documentar las dependencias del manifiesto real, sus versiones y las acciones acordadas. No se afirma que se haya realizado esa revisión.

No se ejecutaron pruebas: no se proporcionó un repositorio ni un entorno.

```typescript
// auth-api-config.service.ts
import { Inject, Injectable, InjectionToken } from '@angular/core';

export interface AuthApiConfig {
  /**
   * URL base explícita del servicio de autenticación, por ejemplo:
   * https://auth.example.invalid/api
   *
   * El valor es solo configuración del cliente; no define ni autoriza
   * ningún origen en la política CORS del servidor.
   */
  baseUrl: string;
}

export const AUTH_API_CONFIG = new InjectionToken<AuthApiConfig>(
  'AUTH_API_CONFIG',
);

@Injectable({ providedIn: 'root' })
export class AuthApiConfigService {
  readonly baseUrl: string;

  constructor(
    @Inject(AUTH_API_CONFIG) config: AuthApiConfig,
  ) {
    this.baseUrl = normalizeAuthApiBaseUrl(config?.baseUrl);
  }
}

function normalizeAuthApiBaseUrl(value: string | undefined): string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    throw new Error('La URL base de auth debe configurarse explícitamente.');
  }

  if (value.includes('*')) {
    throw new Error('La URL base de auth no admite comodines.');
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error('La URL base de auth debe ser una URL absoluta válida.');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('La URL base de auth debe usar HTTP o HTTPS.');
  }

  if (url.username || url.password) {
    throw new Error('La URL base de auth no debe incluir credenciales.');
  }

  if (url.search || url.hash) {
    throw new Error('La URL base de auth no debe incluir query ni fragmento.');
  }

  const path = url.pathname.replace(/\/+$/, '');

  return `${url.origin}${path}`;
}
```