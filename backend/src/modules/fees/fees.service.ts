import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, PaymentGateway, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { assertCanAccessStudent } from '../../common/utils/ownership';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { generateGatewayRef, verifyWebhookSignature } from './payment-gateway.util';

@Injectable()
export class FeesService {
  constructor(private prisma: PrismaService) {}

  async listFeeStructures(schoolId: string) {
    const structures = await this.prisma.feeStructure.findMany({
      where: { schoolId },
      include: { class: { select: { name: true } } },
      orderBy: { dueOn: 'asc' },
    });
    return { data: structures };
  }

  async createFeeStructure(schoolId: string, dto: CreateFeeStructureDto) {
    const klass = await this.prisma.class.findFirst({
      where: { id: dto.classId, academicYear: { schoolId } },
    });
    if (!klass) throw new NotFoundException('Class not found');

    const structure = await this.prisma.feeStructure.create({
      data: {
        schoolId,
        classId: dto.classId,
        academicYearId: dto.academicYearId,
        feeType: dto.feeType,
        amountBdt: dto.amountBdt,
        dueOn: new Date(dto.dueOn),
      },
    });
    return { data: structure };
  }

  /** Idempotent: a student already invoiced for this fee structure is skipped, not re-billed. */
  async generateInvoices(schoolId: string, feeStructureId: string) {
    const structure = await this.prisma.feeStructure.findFirst({
      where: { id: feeStructureId, schoolId },
    });
    if (!structure) throw new NotFoundException('Fee structure not found');

    const students = await this.prisma.studentProfile.findMany({
      where: { section: { classId: structure.classId } },
      select: { userId: true },
    });

    const result = await this.prisma.studentInvoice.createMany({
      data: students.map((s) => ({
        studentId: s.userId,
        feeStructureId,
        amountDueBdt: structure.amountBdt,
      })),
      skipDuplicates: true, // relies on the @@unique([studentId, feeStructureId]) constraint
    });
    return { data: { created: result.count, consideredStudents: students.length } };
  }

  async listInvoices(
    schoolId: string,
    user: AuthenticatedUser,
    filters: { studentId?: string; status?: InvoiceStatus },
  ) {
    // A student only ever means themself — fixed to their own id rather
    // than trusted from the query string, same reasoning as a Parent
    // being required to name a studentId instead of seeing every family's
    // invoices by default.
    if (user.role === 'STUDENT') {
      filters = { ...filters, studentId: user.sub };
    }
    if (user.role === 'PARENT' && !filters.studentId) {
      throw new BadRequestException('studentId is required for the parent role');
    }
    if (filters.studentId) {
      await assertCanAccessStudent(this.prisma, user, filters.studentId);
    }

    const invoices = await this.prisma.studentInvoice.findMany({
      where: {
        student: { user: { schoolId } },
        studentId: filters.studentId,
        status: filters.status,
      },
      include: {
        feeStructure: { select: { feeType: true, dueOn: true } },
        student: { select: { user: { select: { fullName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: invoices };
  }

  /** Hands back a mock hosted-checkout reference; nothing is recorded until the webhook confirms it. */
  async checkout(schoolId: string, user: AuthenticatedUser, invoiceId: string) {
    const invoice = await this.prisma.studentInvoice.findFirst({
      where: { id: invoiceId, student: { user: { schoolId } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    await assertCanAccessStudent(this.prisma, user, invoice.studentId);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Invoice already paid');
    }

    const gatewayRef = generateGatewayRef();
    return {
      data: {
        redirectUrl: `https://sandbox.sslcommerz.com/mock-checkout/${gatewayRef}`,
        gatewayRef,
        amountDueBdt: invoice.amountDueBdt,
      },
    };
  }

  async recordManualPayment(schoolId: string, invoiceId: string, dto: RecordPaymentDto) {
    const invoice = await this.prisma.studentInvoice.findFirst({
      where: { id: invoiceId, student: { user: { schoolId } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const payment = await this.prisma.studentPayment.create({
      data: {
        invoiceId,
        amountPaidBdt: dto.amountPaidBdt,
        gateway: dto.method === 'CASH' ? PaymentGateway.CASH : PaymentGateway.BANK_TRANSFER,
      },
    });

    await this.settleIfCovered(invoiceId);
    return { data: payment };
  }

  /**
   * The one unauthenticated route in the API — trust comes from the
   * signature, not a JWT. Retried callbacks are a no-op: StudentPayment.gatewayRef
   * is unique, so a duplicate create throws P2025/P2002, caught and treated
   * as already-processed rather than an error.
   */
  async handleWebhook(dto: PaymentWebhookDto) {
    if (!verifyWebhookSignature(dto.invoiceId, dto.gatewayRef, dto.amountPaidBdt, dto.signature)) {
      throw new BadRequestException('Invalid signature');
    }

    const invoice = await this.prisma.studentInvoice.findUnique({ where: { id: dto.invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    try {
      await this.prisma.studentPayment.create({
        data: {
          invoiceId: dto.invoiceId,
          amountPaidBdt: dto.amountPaidBdt,
          gateway: PaymentGateway.SSLCOMMERZ,
          gatewayRef: dto.gatewayRef,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return { data: { status: 'already_processed' } }; // idempotent retry
      }
      throw err;
    }

    await this.settleIfCovered(dto.invoiceId);
    return { data: { status: 'settled' } };
  }

  private async settleIfCovered(invoiceId: string) {
    const invoice = await this.prisma.studentInvoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { payments: true },
    });
    const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amountPaidBdt), 0);
    if (totalPaid >= Number(invoice.amountDueBdt) && invoice.status !== InvoiceStatus.PAID) {
      await this.prisma.studentInvoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.PAID },
      });
    }
  }
}
