import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { InvoiceStatus, Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.interface';
import { FeesService } from './fees.service';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';

// Campus API Table 06 — Fees & Billing (everything except the public webhook).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class FeesController {
  constructor(private service: FeesService) {}

  @Roles(Role.ADMIN)
  @Get('fee-structures')
  listFeeStructures(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listFeeStructures(user.schoolId!);
  }

  @Roles(Role.ADMIN)
  @Post('fee-structures')
  createFeeStructure(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFeeStructureDto) {
    return this.service.createFeeStructure(user.schoolId!, dto);
  }

  @Roles(Role.ADMIN)
  @Post('fee-structures/:id/generate-invoices')
  generateInvoices(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.generateInvoices(user.schoolId!, id);
  }

  @Roles(Role.ADMIN, Role.PARENT, Role.STUDENT)
  @Get('invoices')
  listInvoices(
    @CurrentUser() user: AuthenticatedUser,
    @Query('studentId') studentId?: string,
    @Query('status') status?: InvoiceStatus,
  ) {
    return this.service.listInvoices(user.schoolId!, user, { studentId, status });
  }

  @Roles(Role.PARENT)
  @Post('invoices/:id/checkout')
  checkout(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.checkout(user.schoolId!, user, id);
  }

  @Roles(Role.ADMIN)
  @Post('invoices/:id/payments')
  recordPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.service.recordManualPayment(user.schoolId!, id, dto);
  }
}
