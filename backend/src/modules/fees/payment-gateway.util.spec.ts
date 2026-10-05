import { generateGatewayRef, signWebhookPayload, verifyWebhookSignature } from './payment-gateway.util';

describe('payment-gateway.util', () => {
  it('generateGatewayRef produces a unique, recognizable mock reference each time', () => {
    const a = generateGatewayRef();
    const b = generateGatewayRef();
    expect(a).toMatch(/^MOCK-/);
    expect(a).not.toBe(b);
  });

  it('verifyWebhookSignature accepts a signature produced by signWebhookPayload for the same inputs', () => {
    const signature = signWebhookPayload('invoice-1', 'MOCK-abc', 1500);
    expect(verifyWebhookSignature('invoice-1', 'MOCK-abc', 1500, signature)).toBe(true);
  });

  it('rejects the signature if any field was tampered with', () => {
    const signature = signWebhookPayload('invoice-1', 'MOCK-abc', 1500);
    expect(verifyWebhookSignature('invoice-1', 'MOCK-abc', 999999, signature)).toBe(false);
    expect(verifyWebhookSignature('invoice-2', 'MOCK-abc', 1500, signature)).toBe(false);
    expect(verifyWebhookSignature('invoice-1', 'MOCK-xyz', 1500, signature)).toBe(false);
  });

  it('rejects a garbage signature', () => {
    expect(verifyWebhookSignature('invoice-1', 'MOCK-abc', 1500, 'not-a-real-signature')).toBe(false);
  });
});
