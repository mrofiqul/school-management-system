import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapTestApp } from './bootstrap-app';
import { buildClassroomFixture, ClassroomFixture, linkParent, login } from './classroom-fixture';
import { signWebhookPayload } from '../src/modules/fees/payment-gateway.util';

const ADMIN_EMAIL = 'admin@scholarsacademy.test';
const ADMIN_PASSWORD = 'ChangeMe123!';

async function createFeeStructure(app: INestApplication, adminToken: string, fx: ClassroomFixture, amountBdt = 1000) {
  const res = await request(app.getHttpServer())
    .post('/v1/fee-structures')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      classId: fx.classId,
      academicYearId: fx.academicYearId,
      feeType: `Tuition ${fx.suffix}`,
      amountBdt,
      dueOn: '2026-07-01',
    })
    .expect(201);
  return res.body.data.id as string;
}

async function generateInvoiceFor(app: INestApplication, adminToken: string, feeStructureId: string, fx: ClassroomFixture) {
  await request(app.getHttpServer())
    .post(`/v1/fee-structures/${feeStructureId}/generate-invoices`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send()
    .expect(201);

  const invoices = await request(app.getHttpServer())
    .get(`/v1/invoices?studentId=${fx.studentId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200);
  return invoices.body.data[0].id as string;
}

describe('Fees & Billing (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    adminToken = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  afterAll(async () => {
    await app.close();
  });

  it('full chain: generate an invoice, check out, settle via the signed webhook', async () => {
    const fx = await buildClassroomFixture(app, adminToken);
    const { parentToken } = await linkParent(app, adminToken, fx.studentId);
    const feeStructureId = await createFeeStructure(app, adminToken, fx, 1000);
    const invoiceId = await generateInvoiceFor(app, adminToken, feeStructureId, fx);

    const asParent = await request(app.getHttpServer())
      .get(`/v1/invoices?studentId=${fx.studentId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    expect(asParent.body.data[0].status).toBe('PENDING');

    const checkout = await request(app.getHttpServer())
      .post(`/v1/invoices/${invoiceId}/checkout`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(201);
    const { gatewayRef } = checkout.body.data;
    expect(typeof gatewayRef).toBe('string');

    const amountPaidBdt = 1000;
    const signature = signWebhookPayload(invoiceId, gatewayRef, amountPaidBdt);
    const webhookRes = await request(app.getHttpServer())
      .post('/v1/payments/webhook/sslcommerz')
      .send({ invoiceId, gatewayRef, amountPaidBdt, signature })
      .expect(201);
    expect(webhookRes.body.data.status).toBe('settled');

    const afterSettle = await request(app.getHttpServer())
      .get(`/v1/invoices?studentId=${fx.studentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(afterSettle.body.data[0].status).toBe('PAID');

    // A retried callback (same gatewayRef) is a no-op, not a duplicate payment or an error.
    const retried = await request(app.getHttpServer())
      .post('/v1/payments/webhook/sslcommerz')
      .send({ invoiceId, gatewayRef, amountPaidBdt, signature })
      .expect(201);
    expect(retried.body.data.status).toBe('already_processed');

    // And an already-PAID invoice can't be checked out again.
    await request(app.getHttpServer())
      .post(`/v1/invoices/${invoiceId}/checkout`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(400);
  });

  it('rejects a webhook with an invalid signature', async () => {
    const fx = await buildClassroomFixture(app, adminToken);
    const feeStructureId = await createFeeStructure(app, adminToken, fx, 500);
    const invoiceId = await generateInvoiceFor(app, adminToken, feeStructureId, fx);

    await request(app.getHttpServer())
      .post('/v1/payments/webhook/sslcommerz')
      .send({ invoiceId, gatewayRef: 'MOCK-forged', amountPaidBdt: 500, signature: 'not-a-real-signature' })
      .expect(400);
  });

  it('generating invoices twice for the same fee structure does not double-bill', async () => {
    const fx = await buildClassroomFixture(app, adminToken);
    const feeStructureId = await createFeeStructure(app, adminToken, fx, 750);

    const first = await request(app.getHttpServer())
      .post(`/v1/fee-structures/${feeStructureId}/generate-invoices`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send()
      .expect(201);
    expect(first.body.data.created).toBe(1);

    const second = await request(app.getHttpServer())
      .post(`/v1/fee-structures/${feeStructureId}/generate-invoices`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send()
      .expect(201);
    expect(second.body.data.created).toBe(0);

    const invoices = await request(app.getHttpServer())
      .get(`/v1/invoices?studentId=${fx.studentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(invoices.body.data).toHaveLength(1);
  });

  it('an admin recording a manual cash payment settles the invoice once fully covered', async () => {
    const fx = await buildClassroomFixture(app, adminToken);
    const feeStructureId = await createFeeStructure(app, adminToken, fx, 600);
    const invoiceId = await generateInvoiceFor(app, adminToken, feeStructureId, fx);

    // A partial payment must not settle the invoice early.
    await request(app.getHttpServer())
      .post(`/v1/invoices/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amountPaidBdt: 300, method: 'CASH' })
      .expect(201);
    const partial = await request(app.getHttpServer())
      .get(`/v1/invoices?studentId=${fx.studentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(partial.body.data[0].status).toBe('PENDING');

    await request(app.getHttpServer())
      .post(`/v1/invoices/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amountPaidBdt: 300, method: 'CASH' })
      .expect(201);
    const full = await request(app.getHttpServer())
      .get(`/v1/invoices?studentId=${fx.studentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(full.body.data[0].status).toBe('PAID');
  });

  it('a student always sees only their own invoices, and a parent must name a studentId they actually guard', async () => {
    const fx = await buildClassroomFixture(app, adminToken);
    const { parentToken } = await linkParent(app, adminToken, fx.studentId);
    const feeStructureId = await createFeeStructure(app, adminToken, fx, 400);
    await generateInvoiceFor(app, adminToken, feeStructureId, fx);

    const asStudent = await request(app.getHttpServer())
      .get('/v1/invoices')
      .set('Authorization', `Bearer ${fx.studentToken}`)
      .expect(200);
    expect(asStudent.body.data).toHaveLength(1);
    expect(asStudent.body.data[0].studentId).toBe(fx.studentId);

    await request(app.getHttpServer()).get('/v1/invoices').set('Authorization', `Bearer ${parentToken}`).expect(400);

    const otherSuffix = randomUUID();
    const otherStudent = await request(app.getHttpServer())
      .post('/v1/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Unrelated Student',
        email: `unrelated-${otherSuffix}@fixture.example`,
        password: 'ChangeMe123!',
        dob: '2012-05-01',
        admissionNo: `ADM-${otherSuffix}`,
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/v1/invoices?studentId=${otherStudent.body.data.userId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403);
  });

  it('only an ADMIN may create fee structures or record payments; only a PARENT may check out', async () => {
    const fx = await buildClassroomFixture(app, adminToken);
    const { parentToken } = await linkParent(app, adminToken, fx.studentId);

    await request(app.getHttpServer())
      .post('/v1/fee-structures')
      .set('Authorization', `Bearer ${fx.teacherToken}`)
      .send({ classId: fx.classId, academicYearId: fx.academicYearId, feeType: 'Nope', amountBdt: 100, dueOn: '2026-07-01' })
      .expect(403);

    const feeStructureId = await createFeeStructure(app, adminToken, fx, 100);
    const invoiceId = await generateInvoiceFor(app, adminToken, feeStructureId, fx);

    await request(app.getHttpServer())
      .post(`/v1/invoices/${invoiceId}/checkout`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/v1/invoices/${invoiceId}/payments`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ amountPaidBdt: 100, method: 'CASH' })
      .expect(403);
  });
});
