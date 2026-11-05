// auth-login.component.ts
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Output, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService, LoginResponse } from './nombre.service';

@Component({
  selector: 'app-auth-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div>
        <label for="username">Usuario</label>
        <input
          id="username"
          type="text"
          formControlName="username"
          autocomplete="username"
          [attr.aria-invalid]="usernameInvalid"
          [attr.aria-describedby]="usernameInvalid ? 'username-error' : null"
        />
        @if (usernameInvalid) {
          <p id="username-error">Ingresa tu usuario.</p>
        }
      </div>

      <div>
        <label for="password">Contraseña</label>
        <input
          id="password"
          type="password"
          formControlName="password"
          autocomplete="current-password"
          [attr.aria-invalid]="passwordInvalid"
          [attr.aria-describedby]="passwordInvalid ? 'password-error' : null"
        />
        @if (passwordInvalid) {
          <p id="password-error">Ingresa tu contraseña.</p>
        }
      </div>

      @if (errorMessage) {
        <p role="alert">{{ errorMessage }}</p>
      }

      @if (succeeded) {
        <p role="status">Inicio de sesión correcto.</p>
      }

      <button type="submit" [disabled]="submitting || succeeded">
        {{ submitting ? 'Ingresando…' : 'Iniciar sesión' }}
      </button>
    </form>
  `,
  styles: [`
    input:focus-visible,
    button:focus-visible {
      outline: 3px solid #155eef;
      outline-offset: 2px;
    }
  `],
})
export class AuthLoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  @Output() readonly authenticated = new EventEmitter<LoginResponse>();

  readonly form = this.formBuilder.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  submitting = false;
  succeeded = false;
  errorMessage = '';

  get usernameInvalid(): boolean {
    const control = this.form.controls.username;
    return control.invalid && control.touched;
  }

  get passwordInvalid(): boolean {
    const control = this.form.controls.password;
    return control.invalid && control.touched;
  }

  submit(): void {
    if (this.submitting || this.succeeded) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.submitting = true;

    this.authService
      .login(this.form.getRawValue())
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: (response) => {
          this.succeeded = true;
          this.authenticated.emit(response);
        },
        error: (error: unknown) => {
          this.errorMessage =
            error instanceof HttpErrorResponse && error.status === 401
              ? 'Usuario o contraseña incorrectos.'
              : 'No se pudo iniciar sesión. Inténtalo nuevamente.';
        },
      });
  }
}