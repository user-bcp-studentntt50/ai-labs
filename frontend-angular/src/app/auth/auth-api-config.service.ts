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