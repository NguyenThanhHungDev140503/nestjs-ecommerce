import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaService } from 'libs/common/database/prisma.service';
import { CreateCustomerDto } from 'libs/common/dto/customer/create-customer.dto';
import { UpdateCustomerDto } from 'libs/common/dto/customer/update-customer.dto';
import { CustomerQueryDto } from 'libs/common/dto/customer/customer-query.dto';
import {
  CustomerDetails,
  CustomerStatus,
  CustomerValidationResult,
} from 'libs/common/interfaces/customer.interface';
import * as crypto from 'crypto';

@Injectable()
export class CustomerServiceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Hash password using SHA-256 (for demo purposes)
   * In production, use bcrypt or argon2
   */
  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  /**
   * Create a new customer
   */
  async createCustomer(dto: CreateCustomerDto): Promise<CustomerDetails> {
    console.log('Customer Service: Creating customer', dto.email);

    // Check if email already exists
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { email: dto.email },
    });

    if (existingCustomer) {
      throw new RpcException({
        statusCode: 409,
        message: `Email ${dto.email} đã được sử dụng`,
      });
    }

    try {
      const customer = await this.prisma.customer.create({
        data: {
          name: dto.name,
          email: dto.email,
          password_hash: dto.password ? this.hashPassword(dto.password) : null,
          phone: dto.phone,
          shipping_address: dto.shipping_address,
        },
      });

      console.log('Customer Service: Customer created', customer.id);

      return this.mapToCustomerDetails(customer);
    } catch (error) {
      console.error('Customer Service: Error creating customer', error);
      throw new RpcException({
        statusCode: 500,
        message: 'Không thể tạo khách hàng',
      });
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(customerId: string): Promise<CustomerDetails> {
    console.log('Customer Service: Getting customer', customerId);

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new RpcException({
        statusCode: 404,
        message: `Không tìm thấy khách hàng với ID: ${customerId}`,
      });
    }

    return this.mapToCustomerDetails(customer);
  }

  /**
   * Get customer details (for backward compatibility with existing pattern)
   */
  async getCustomerDetails(customerId: string): Promise<CustomerDetails> {
    console.log('Customer Service received request for:', customerId);

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (customer) {
      return this.mapToCustomerDetails(customer);
    }

    // Fallback to mock data if customer not found (backward compatibility)
    console.log('Customer Service: Customer not found, returning mock data');
    return {
      id: customerId,
      name: 'Mock Customer',
      email: 'mock.customer@example.com',
      phone: '+123456789',
      shipping_address: '1234 Mock St, Mock City, Mock Country',
      role: 'CUSTOMER' as any,
      status: CustomerStatus.ACTIVE,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  /**
   * Update customer
   */
  async updateCustomer(
    customerId: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerDetails> {
    console.log('Customer Service: Updating customer', customerId);

    // Check if customer exists
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!existingCustomer) {
      throw new RpcException({
        statusCode: 404,
        message: `Không tìm thấy khách hàng với ID: ${customerId}`,
      });
    }

    // Check email uniqueness if updating email
    if (dto.email && dto.email !== existingCustomer.email) {
      const emailExists = await this.prisma.customer.findUnique({
        where: { email: dto.email },
      });

      if (emailExists) {
        throw new RpcException({
          statusCode: 409,
          message: `Email ${dto.email} đã được sử dụng`,
        });
      }
    }

    try {
      const customer = await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.email && { email: dto.email }),
          ...(dto.password && { password_hash: this.hashPassword(dto.password) }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.shipping_address !== undefined && { shipping_address: dto.shipping_address }),
          ...(dto.role && { role: dto.role }),
          ...(dto.status && { status: dto.status }),
        },
      });

      console.log('Customer Service: Customer updated', customer.id);
      return this.mapToCustomerDetails(customer);
    } catch (error) {
      console.error('Customer Service: Error updating customer', error);
      throw new RpcException({
        statusCode: 500,
        message: 'Không thể cập nhật khách hàng',
      });
    }
  }

  // Part 2 will be added via str-replace-editor
  /**
   * Delete customer (soft delete by changing status)
   */
  async deleteCustomer(customerId: string): Promise<{ success: boolean; message: string }> {
    console.log('Customer Service: Deleting customer', customerId);

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new RpcException({
        statusCode: 404,
        message: `Không tìm thấy khách hàng với ID: ${customerId}`,
      });
    }

    // Check if customer has orders
    const orderCount = await this.prisma.order.count({
      where: { customer_id: customerId },
    });

    if (orderCount > 0) {
      // Soft delete - change status to INACTIVE
      await this.prisma.customer.update({
        where: { id: customerId },
        data: { status: 'INACTIVE' },
      });

      return {
        success: true,
        message: `Khách hàng đã được vô hiệu hóa (có ${orderCount} đơn hàng liên quan)`,
      };
    }

    // Hard delete if no orders
    await this.prisma.customer.delete({
      where: { id: customerId },
    });

    return {
      success: true,
      message: 'Khách hàng đã được xóa thành công',
    };
  }

  /**
   * Search customers with filters
   */
  async searchCustomers(query: CustomerQueryDto): Promise<{
    data: CustomerDetails[];
    total: number;
    page: number;
    limit: number;
  }> {
    console.log('Customer Service: Searching customers', query);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.email) {
      where.email = { contains: query.email, mode: 'insensitive' };
    }

    if (query.name) {
      where.name = { contains: query.name, mode: 'insensitive' };
    }

    if (query.status) {
      where.status = query.status;
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers.map((c) => this.mapToCustomerDetails(c)),
      total,
      page,
      limit,
    };
  }

  /**
   * Validate customer for order creation
   */
  async validateCustomer(customerId: string): Promise<CustomerValidationResult> {
    console.log('Customer Service: Validating customer', customerId);

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return {
        is_valid: false,
        error: `Không tìm thấy khách hàng với ID: ${customerId}`,
      };
    }

    if (customer.status !== 'ACTIVE') {
      return {
        is_valid: false,
        customer: this.mapToCustomerDetails(customer),
        error: `Tài khoản khách hàng đang ở trạng thái: ${customer.status}`,
      };
    }

    return {
      is_valid: true,
      customer: this.mapToCustomerDetails(customer),
    };
  }

  /**
   * Map Prisma customer to CustomerDetails interface
   */
  private mapToCustomerDetails(customer: any): CustomerDetails {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      shipping_address: customer.shipping_address,
      role: customer.role,
      status: customer.status,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
    };
  }
}
