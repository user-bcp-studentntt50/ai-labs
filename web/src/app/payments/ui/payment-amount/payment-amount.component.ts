import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { getMessage } from '../../config/messages.es';
import { getDefaultAmountLimits, PAYMENTS_CONFIG } from '../../config/payments.config';
import { validateAmount } from '../../domain/amount-rules';
import { solesToCents } from '../../domain/money';
import { PaymentFlowStore } from '../../application/payment-flow.store';
import { PaymentShellComponent } from '../shell/payment-shell.component';

const AMOUNT_ERROR_KEYS = {
  NOT_A_NUMBER: 'amount.error.notANumber',
  BELOW_CAPTURE_FLOOR: 'amount.error.belowCaptureFloor',
  BELOW_BUSINESS_MIN: 'amount.error.belowBusinessMin',
  ABOVE_BUSINESS_MAX: 'amount.error.aboveBusinessMax'
} as const;

/** T3: captura de monto en soles; origen de solo lectura, destino = contacto elegido en T2. */
@Component({
  selector: 'app-payments-amount',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentShellComponent],
  templateUrl: './payment-amount.component.html',
  styleUrl: './payment-amount.component.css'
})
export class PaymentAmountComponent implements OnInit {
  readonly title = getMessage('amount.title');
  readonly originLabel = getMessage('amount.originLabel');
  readonly destinationLabel = getMessage('amount.destinationLabel');
  readonly inputLabel = getMessage('amount.inputLabel');
  readonly continueLabel = getMessage('amount.continueCta');
  readonly originId = PAYMENTS_CONFIG.walletId;

  amountText = '';
  errorMessage: string | null = null;

  constructor(
    private readonly router: Router,
    private readonly flowStore: PaymentFlowStore
  ) {}

  get destinationName(): string {
    return this.flowStore.draft().contact?.displayName ?? '';
  }

  async ngOnInit(): Promise<void> {
    if (!this.flowStore.hasContact()) {
      await this.router.navigate(['/pagos/inicio']);
    }
  }

  async continueToConfirmation(): Promise<void> {
    const cents = solesToCents(this.amountText);
    const validation = validateAmount(cents, getDefaultAmountLimits());

    if (validation.ok === false) {
      this.errorMessage = getMessage(AMOUNT_ERROR_KEYS[validation.reason]);
      return;
    }

    this.errorMessage = null;
    this.flowStore.setAmount(cents as number);
    await this.router.navigate(['/pagos/confirmar']);
  }
}
