import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { getMessage, MessageKey } from '../../config/messages.es';
import { centsToDisplay } from '../../domain/money';
import { PaymentFlowStore } from '../../application/payment-flow.store';
import { PAYMENT_ORCHESTRATOR } from '../../application/payment-orchestrator.token';
import { PaymentOrchestrator } from '../../application/payment-orchestrator';
import { PaymentShellComponent } from '../shell/payment-shell.component';

/**
 * T5/CA3/CA4: único resultado terminal por intento (Exitoso, Fallido o Expirado),
 * con referencia (`id` del pago), fecha, destino y monto, y la acción "Volver al
 * inicio". El contrato no incluye una fecha de creación del pago (ver `Payment` en
 * el OpenAPI), así que la fecha mostrada es la hora local al llegar a esta pantalla.
 */
@Component({
  selector: 'app-payments-result',
  standalone: true,
  imports: [CommonModule, PaymentShellComponent],
  templateUrl: './payment-result.component.html',
  styleUrl: './payment-result.component.css'
})
export class PaymentResultComponent implements OnInit {
  readonly referenceLabel = getMessage('result.referenceLabel');
  readonly dateLabel = getMessage('result.dateLabel');
  readonly destinationLabel = getMessage('result.destinationLabel');
  readonly amountLabel = getMessage('result.amountLabel');
  readonly backToHomeLabel = getMessage('result.backToHomeCta');

  title = '';
  message = '';
  reference = '';
  dateDisplay = '';
  destinationDisplay = '';
  amountDisplay = '';
  isSucceeded = false;

  constructor(
    private readonly router: Router,
    private readonly flowStore: PaymentFlowStore,
    @Inject(PAYMENT_ORCHESTRATOR) private readonly orchestrator: PaymentOrchestrator
  ) {}

  async ngOnInit(): Promise<void> {
    const draft = this.flowStore.draft();
    this.destinationDisplay = draft.contact?.displayName ?? '';
    this.amountDisplay = draft.amountCents !== null ? centsToDisplay(draft.amountCents) : '';
    this.dateDisplay = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());

    const state = this.orchestrator.getState();
    switch (state.phase) {
      case 'SUCCEEDED':
        this.isSucceeded = true;
        this.title = getMessage('result.succeeded.title');
        this.message = getMessage('result.succeeded.message');
        this.reference = state.paymentId;
        return;
      case 'FAILED':
        this.title = getMessage('result.failed.title');
        // El orquestador solo asigna claves conocidas del catálogo (ver payment-orchestrator.ts);
        // se ensancha a `string` en el dominio para no acoplarlo a `config/messages.es`.
        this.message = getMessage(state.messageKey as MessageKey);
        this.reference = state.paymentId ?? '';
        return;
      case 'EXPIRED':
        this.title = getMessage('result.expired.title');
        this.message = getMessage('result.expired.message');
        this.reference = state.paymentId;
        return;
      default:
        // No debería llegarse a esta pantalla sin pasar por un estado terminal.
        await this.router.navigate(['/pagos/inicio']);
    }
  }

  async backToHome(): Promise<void> {
    this.flowStore.reset();
    await this.router.navigate(['/pagos/inicio']);
  }
}
