import { environment } from '../../environments/environment';

export const API_ENDPOINTS = {
  login: `${environment.authApiUrl}/auth/login`,
  tasks: `${environment.tasksApiUrl}/api/tasks`
} as const;

export const REQUEST_TIMEOUT_MS = 5000;
