import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { getMessage } from '../../config/messages.es';
import { centsToDisplay } from '../../domain/money';
import { PaymentFlowStore } from '../../application/payment-flow.store';
import { PAYMENT_ORCHESTRATOR } from '../../application/payment-orchestrator.token';
import { PaymentOrchestrator } from '../../application/payment-orchestrator';
import { PaymentShellComponent } from '../shell/payment-shell.component';

/** T4/CA1: resumen en texto simple con Confirmar/Corregir antes de enviar el pago. */
@Component({
  selector: 'app-payments-confirmation',
  standalone: true,
  imports: [CommonModule, PaymentShellComponent],
  templateUrl: './payment-confirmation.component.html',
  styleUrl: './payment-confirmation.component.css'
})
export class PaymentConfirmationComponent implements OnInit {
  readonly title = getMessage('confirmation.title');
  readonly confirmLabel = getMessage('confirmation.confirmCta');
  readonly correctLabel = getMessage('confirmation.correctCta');

  summary = '';
  submitting = false;

  constructor(
    private readonly router: Router,
    private readonly flowStore: PaymentFlowStore,
    @Inject(PAYMENT_ORCHESTRATOR) private readonly orchestrator: PaymentOrchestrator
  ) {}

  async ngOnInit(): Promise<void> {
    const draft = this.flowStore.draft();
    if (!draft.contact || draft.amountCents === null) {
      await this.router.navigate(['/pagos/inicio']);
      return;
    }
    this.summary = getMessage('confirmation.summary', {
      amount: centsToDisplay(draft.amountCents),
      name: draft.contact.displayName
    });
  }

  async confirm(): Promise<void> {
    if (this.submitting) {
      return;
    }
    this.submitting = true;

    const draft = this.flowStore.draft();
    if (!draft.contact || draft.amountCents === null) {
      await this.router.navigate(['/pagos/inicio']);
      return;
    }

    // No se espera la respuesta completa aquí: la pantalla de "Procesando" observa
    // el estado del orquestador, que sigue vivo (es un singleton) tras la navegación.
    void this.orchestrator.submit(draft.contact.recipient, draft.amountCents);
    await this.router.navigate(['/pagos/procesando']);
  }

  async correct(): Promise<void> {
    await this.router.navigate(['/pagos/monto']);
  }
}
