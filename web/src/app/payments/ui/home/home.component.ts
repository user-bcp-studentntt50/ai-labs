import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { getMessage } from '../../config/messages.es';
import { PAYMENTS_CONFIG } from '../../config/payments.config';
import { centsToDisplay } from '../../domain/money';
import { PaymentsApi } from '../../data/payments-api';
import { PaymentFlowStore } from '../../application/payment-flow.store';
import { getSessionDisplayName } from '../../application/session-user';
import { PaymentShellComponent } from '../shell/payment-shell.component';

/** T1: saludo, saldo disponible (`GET /wallets/wallet-demo`) y acceso a "Nuevo pago". */
@Component({
  selector: 'app-payments-home',
  standalone: true,
  imports: [CommonModule, PaymentShellComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class PaymentsHomeComponent implements OnInit {
  private readonly api = new PaymentsApi(PAYMENTS_CONFIG);

  readonly greeting = getMessage('home.greeting', { name: getSessionDisplayName() });
  readonly balanceLabel = getMessage('home.balanceLabel');
  readonly newPaymentLabel = getMessage('home.newPaymentCta');
  readonly retryLabel = getMessage('home.retryCta');
  readonly errorMessage = getMessage('home.balanceError');

  loading = true;
  error = false;
  balanceDisplay = '';

  constructor(
    private readonly router: Router,
    private readonly flowStore: PaymentFlowStore
  ) {}

  ngOnInit(): void {
    void this.loadBalance();
  }

  async loadBalance(): Promise<void> {
    this.loading = true;
    this.error = false;
    const result = await this.api.getWallet(PAYMENTS_CONFIG.walletId);
    if (result.kind === 'ok') {
      this.balanceDisplay = centsToDisplay(result.value.availableCents);
    } else {
      this.error = true;
    }
    this.loading = false;
  }

  async startNewPayment(): Promise<void> {
    this.flowStore.reset();
    await this.router.navigate(['/pagos/contacto']);
  }
}
