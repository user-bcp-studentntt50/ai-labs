import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { getMessage } from '../../config/messages.es';
import { PaymentAttemptState } from '../../domain/payment-status';
import { PAYMENT_ORCHESTRATOR } from '../../application/payment-orchestrator.token';
import { PaymentOrchestrator } from '../../application/payment-orchestrator';
import { PaymentShellComponent } from '../shell/payment-shell.component';

const TERMINAL_PHASES: ReadonlySet<PaymentAttemptState['phase']> = new Set(['SUCCEEDED', 'FAILED', 'EXPIRED']);

/**
 * T5 (estado intermedio): observa al `PaymentOrchestrator` singleton y navega al
 * resultado en cuanto el intento llega a un estado terminal. Reanuda un intento
 * persistido (ADR-003) si se entra directamente a esta pantalla (p. ej. tras cerrar
 * y reabrir la app) y cancela el *polling* propio al salir (sin borrar lo persistido).
 */
@Component({
  selector: 'app-payments-processing',
  standalone: true,
  imports: [CommonModule, PaymentShellComponent],
  templateUrl: './payment-processing.component.html',
  styleUrl: './payment-processing.component.css'
})
export class PaymentProcessingComponent implements OnInit, OnDestroy {
  readonly title = getMessage('processing.title');
  readonly message = getMessage('processing.message');

  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly router: Router,
    @Inject(PAYMENT_ORCHESTRATOR) private readonly orchestrator: PaymentOrchestrator
  ) {}

  ngOnInit(): void {
    this.unsubscribe = this.orchestrator.subscribe((state) => this.onStateChange(state));

    if (this.orchestrator.getState().phase === 'IDLE') {
      this.orchestrator.resume();
    }
    if (this.orchestrator.getState().phase === 'IDLE') {
      void this.router.navigate(['/pagos/inicio']);
      return;
    }
    this.onStateChange(this.orchestrator.getState());
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
    this.orchestrator.cancel();
  }

  private onStateChange(state: PaymentAttemptState): void {
    if (TERMINAL_PHASES.has(state.phase)) {
      void this.router.navigate(['/pagos/resultado']);
    }
  }
}
