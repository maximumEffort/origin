import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { documents: { orderBy: { uploadedAt: 'desc' } } },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async updateProfile(id: string, dto: UpdateCustomerDto) {
    return this.prisma.customer.update({
      where: { id },
      data: dto,
    });
  }

  async getDocuments(id: string) {
    return this.prisma.document.findMany({
      where: { customerId: id },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async addDocument(customerId: string, type: string, fileUrl: string, expiryDate?: string) {
    // Upsert: if document of this type already exists, update it
    const existing = await this.prisma.document.findFirst({
      where: { customerId, type: type as any },
    });

    if (existing) {
      return this.prisma.document.update({
        where: { id: existing.id },
        data: {
          fileUrl,
          status: 'PENDING',
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
          rejectionReason: null,
        },
      });
    }

    const doc = await this.prisma.document.create({
      data: {
        customerId,
        type: type as any,
        fileUrl,
        status: 'PENDING',
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      },
    });

    // Auto-set customer KYC status to SUBMITTED if they have at least 2 docs
    const docCount = await this.prisma.document.count({ where: { customerId } });
    if (docCount >= 2) {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: { kycStatus: 'SUBMITTED' },
      });
    }

    return doc;
  }
}
