import { Injectable } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MESSAGE_PATTERNS } from 'libs/common/constants/patterns';
import { PrismaService } from 'libs/common/database/prisma.service';

@Injectable()
export class CustomerServiceService {
  constructor(private readonly prisma: PrismaService) {}

  @MessagePattern(MESSAGE_PATTERNS.GET_CUSTOMER_DETAILS)
  async getCustomerDetails(customerId: string) {
    console.log('Customer Service received request for:', customerId);

    // Try to find customer in database
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    // Return customer if found, otherwise return mock data
    if (customer) {
      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '+123456789',
        shipping_address: customer.shipping_address || '1234 Mock St, Mock City',
      };
    }

    // Fallback to mock data if customer not found
    return {
      id: customerId,
      name: 'Mock Customer',
      email: 'mock.customer@example.com',
      phone: '+123456789',
      shipping_address: '1234 Mock St, Mock City, Mock Country',
    };
  }
}
