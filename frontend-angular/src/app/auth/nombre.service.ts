// nombre.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: {
    username: string;
  };
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  login(credentials: LoginRequest): Observable<LoginResponse> {
    // Se envían las credenciales tal como fueron ingresadas.
    // La protección contra inyección SQL corresponde al backend.
    return this.http.post<LoginResponse>('/auth/login', {
      username: credentials.username,
      password: credentials.password,
    });
  }
}