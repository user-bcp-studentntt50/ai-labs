import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { LoginRequest, UserPreferences } from '../models/auth.models';
import { SessionService } from '../session.service';
import { isRequestError } from '../utils/request-error';

const CLIENT_ID = 'angular-workshop';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username = '';
  password = '';
  busy = false;
  message = '';
  preferences: UserPreferences;

  constructor(
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly session: SessionService
  ) {
    this.preferences = this.session.getPreferences();
  }

  async login(): Promise<void> {
    this.message = '';
    if (!this.username.trim()) {
      this.message = 'Ingrese un usuario.';
      return;
    }
    if (!this.password.trim()) {
      this.message = 'Ingrese una contraseña.';
      return;
    }

    this.busy = true;
    try {
      const request: LoginRequest = {
        username: this.username,
        password: this.password,
        client: CLIENT_ID
      };
      const response = await this.authService.login(request);
      if (!response.token) {
        this.message = 'El backend respondió sin token.';
        return;
      }

      this.session.saveSession(response);
      this.session.savePreferences(this.preferences);
      await this.router.navigate(['/dashboard']);
    } catch (error: unknown) {
      if (!isRequestError(error)) {
        throw error;
      }
      this.message = 'No se pudo autenticar. Verifica las credenciales e inténtalo nuevamente.';
    } finally {
      this.busy = false;
    }
  }
}
