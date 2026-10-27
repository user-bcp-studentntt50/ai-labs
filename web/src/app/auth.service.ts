import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { API_ENDPOINTS, REQUEST_TIMEOUT_MS } from './config/api.config';
import { LoginRequest, LoginResponse } from './models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private readonly http: HttpClient) {}

  login(request: LoginRequest): Promise<LoginResponse> {
    return firstValueFrom(
      this.http.post<LoginResponse>(API_ENDPOINTS.login, request).pipe(timeout(REQUEST_TIMEOUT_MS))
    );
  }
}
