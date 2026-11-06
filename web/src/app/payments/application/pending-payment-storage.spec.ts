import { describe, expect, it } from 'vitest';
import { PendingPayment, PendingPaymentStorage } from './pending-payment-storage';

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    }
  };
}

const samplePending: PendingPayment = {
  paymentId: 'pay_1',
  recipient: 'contact-demo',
  amountCents: 1500,
  startedAt: 1700000000000
};

describe('PendingPaymentStorage', () => {
  it('returns null when nothing was saved', () => {
    const storage = new PendingPaymentStorage(createMemoryStorage());
    expect(storage.load()).toBeNull();
  });

  it('saves and loads the pending payment', () => {
    const storage = new PendingPaymentStorage(createMemoryStorage());
    storage.save(samplePending);
    expect(storage.load()).toEqual(samplePending);
  });

  it('clears the pending payment', () => {
    const storage = new PendingPaymentStorage(createMemoryStorage());
    storage.save(samplePending);
    storage.clear();
    expect(storage.load()).toBeNull();
  });

  it('does not throw when the underlying storage is unavailable', () => {
    const brokenStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
      getItem: () => {
        throw new Error('unavailable');
      },
      setItem: () => {
        throw new Error('unavailable');
      },
      removeItem: () => {
        throw new Error('unavailable');
      }
    };
    const storage = new PendingPaymentStorage(brokenStorage as Storage);

    expect(() => storage.save(samplePending)).not.toThrow();
    expect(storage.load()).toBeNull();
    expect(() => storage.clear()).not.toThrow();
  });
});
