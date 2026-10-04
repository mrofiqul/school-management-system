import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const plans = await this.prisma.subscriptionPlan.findMany({ orderBy: { priceBdt: 'asc' } });
    return { data: plans };
  }

  async create(dto: CreatePlanDto) {
    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        tier: dto.tier,
        maxStudents: dto.maxStudents,
        priceBdt: dto.priceBdt,
        billingCycle: dto.billingCycle,
      },
    });
    return { data: plan };
  }
}
