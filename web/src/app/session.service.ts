import { Injectable } from '@angular/core';
import { AuthenticatedUser, LoginResponse, UserPreferences } from './models/auth.models';

const SESSION_KEYS = {
  token: 'workshop_token',
  user: 'workshop_user',
  preferences: 'workshop_preferences'
} as const;

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  showTips: true,
  compact: false
};

@Injectable({ providedIn: 'root' })
export class SessionService {
  saveSession(response: LoginResponse): void {
    sessionStorage.setItem(SESSION_KEYS.token, response.token ?? '');
    sessionStorage.setItem(SESSION_KEYS.user, JSON.stringify(response.user));
  }

  getToken(): string | null {
    return sessionStorage.getItem(SESSION_KEYS.token);
  }

  getUser(): AuthenticatedUser | null {
    const storedUser = sessionStorage.getItem(SESSION_KEYS.user);
    if (!storedUser) {
      return null;
    }

    try {
      const user: unknown = JSON.parse(storedUser);
      if (isAuthenticatedUser(user)) {
        return user;
      }
    } catch (error: unknown) {
      console.warn('Stored session user could not be read', error);
    }
    return null;
  }

  clearSession(): void {
    sessionStorage.removeItem(SESSION_KEYS.token);
    sessionStorage.removeItem(SESSION_KEYS.user);
  }

  getPreferences(): UserPreferences {
    const storedPreferences = localStorage.getItem(SESSION_KEYS.preferences);
    if (!storedPreferences) {
      return { ...DEFAULT_PREFERENCES };
    }

    try {
      const preferences: unknown = JSON.parse(storedPreferences);
      if (isRecord(preferences)) {
        return {
          theme: getStringPreference(preferences.theme, DEFAULT_PREFERENCES.theme),
          showTips: getBooleanPreference(preferences.showTips, DEFAULT_PREFERENCES.showTips),
          compact: getBooleanPreference(preferences.compact, DEFAULT_PREFERENCES.compact)
        };
      }
    } catch (error: unknown) {
      console.warn('Preferences could not be loaded', error);
    }
    return { ...DEFAULT_PREFERENCES };
  }

  savePreferences(preferences: UserPreferences): void {
    localStorage.setItem(SESSION_KEYS.preferences, JSON.stringify(preferences));
  }
}

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  return isRecord(value) && typeof value.username === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getStringPreference(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function getBooleanPreference(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}
