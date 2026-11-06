import { describe, expect, it } from 'vitest';
import { PaymentResponseDto, toDomainPayment, toDomainWallet, WalletResponseDto } from './payment-dto';

describe('toDomainPayment', () => {
  it('normalizes the snake_case response confirmed in the connectivity spike', () => {
    const dto: PaymentResponseDto = {
      id: 'pay_4453fdde44ec4fc8',
      wallet_id: 'wallet-demo',
      recipient: 'contact-demo',
      amount: 1500,
      status: 'PENDING',
      scenario: 'APPROVED',
      idem: '37cf97b1-e418-4310-a4d4-badfc780f361',
      fingerprint: '["contact-demo",1500,"PEN","APPROVED",null]'
    };

    expect(toDomainPayment(dto)).toEqual({
      id: 'pay_4453fdde44ec4fc8',
      walletId: 'wallet-demo',
      recipient: 'contact-demo',
      amountCents: 1500,
      status: 'PENDING'
    });
  });
});

describe('toDomainWallet', () => {
  it('normalizes the wallet response, exposing only the available balance', () => {
    const dto: WalletResponseDto = {
      id: 'wallet-demo',
      status: 'ACTIVE',
      balance: 93300,
      reserved: 1500,
      available: 91800,
      currency: 'PEN'
    };

    expect(toDomainWallet(dto)).toEqual({
      id: 'wallet-demo',
      status: 'ACTIVE',
      availableCents: 91800,
      currency: 'PEN'
    });
  });
});
