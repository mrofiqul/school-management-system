import { createHmac, randomUUID } from 'crypto';

/**
 * Stand-in for a real gateway SDK (SSLCommerz, in production). Generates a
 * reference the webhook must echo back, and verifies a shared-secret HMAC
 * in place of the gateway's actual signature scheme. Replace both halves
 * together once SSLCOMMERZ_STORE_ID / _STORE_PASSWORD are real — see
 * backend/.env.example and docs/specification.html §09.
 */
export function generateGatewayRef(): string {
  return `MOCK-${randomUUID()}`;
}

export function signWebhookPayload(invoiceId: string, gatewayRef: string, amountPaidBdt: number): string {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET ?? 'dev-webhook-secret-change-me';
  return createHmac('sha256', secret).update(`${invoiceId}:${gatewayRef}:${amountPaidBdt}`).digest('hex');
}

export function verifyWebhookSignature(
  invoiceId: string,
  gatewayRef: string,
  amountPaidBdt: number,
  signature: string,
): boolean {
  return signWebhookPayload(invoiceId, gatewayRef, amountPaidBdt) === signature;
}
