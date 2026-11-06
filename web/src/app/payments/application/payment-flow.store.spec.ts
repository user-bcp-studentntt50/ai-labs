import { describe, expect, it } from 'vitest';
import { DEMO_CONTACTS } from '../config/contacts.config';
import { PaymentFlowStore } from './payment-flow.store';

describe('PaymentFlowStore', () => {
  it('starts with an empty draft', () => {
    const store = new PaymentFlowStore();
    expect(store.draft()).toEqual({ contact: null, amountCents: null });
    expect(store.hasContact()).toBe(false);
    expect(store.hasCompleteDraft()).toBe(false);
  });

  it('tracks the chosen contact', () => {
    const store = new PaymentFlowStore();
    store.setContact(DEMO_CONTACTS[0]);
    expect(store.draft().contact).toEqual(DEMO_CONTACTS[0]);
    expect(store.hasContact()).toBe(true);
    expect(store.hasCompleteDraft()).toBe(false);
  });

  it('is complete only once both contact and amount are set', () => {
    const store = new PaymentFlowStore();
    store.setContact(DEMO_CONTACTS[0]);
    store.setAmount(1500);
    expect(store.hasCompleteDraft()).toBe(true);
  });

  it('resets back to an empty draft', () => {
    const store = new PaymentFlowStore();
    store.setContact(DEMO_CONTACTS[0]);
    store.setAmount(1500);
    store.reset();
    expect(store.draft()).toEqual({ contact: null, amountCents: null });
  });
});
