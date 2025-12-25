import { Controller } from '@nestjs/common';
import { CustomerServiceService } from './customer-service.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MESSAGE_PATTERNS } from 'libs/common/constants/patterns';
import { CreateCustomerDto } from 'libs/common/dto/customer/create-customer.dto';
import { UpdateCustomerDto } from 'libs/common/dto/customer/update-customer.dto';
import { CustomerQueryDto } from 'libs/common/dto/customer/customer-query.dto';

@Controller()
export class CustomerServiceController {
  constructor(private readonly customerServiceService: CustomerServiceService) {}

  /**
   * Get customer details by ID (backward compatible)
   */
  @MessagePattern(MESSAGE_PATTERNS.GET_CUSTOMER_DETAILS)
  async getCustomerDetails(@Payload() customerId: string) {
    return this.customerServiceService.getCustomerDetails(customerId);
  }

  /**
   * Create new customer
   */
  @MessagePattern(MESSAGE_PATTERNS.CREATE_CUSTOMER)
  async createCustomer(@Payload() dto: CreateCustomerDto) {
    return this.customerServiceService.createCustomer(dto);
  }

  /**
   * Update customer
   */
  @MessagePattern(MESSAGE_PATTERNS.UPDATE_CUSTOMER)
  async updateCustomer(
    @Payload() payload: { customerId: string; data: UpdateCustomerDto },
  ) {
    return this.customerServiceService.updateCustomer(
      payload.customerId,
      payload.data,
    );
  }

  /**
   * Delete customer
   */
  @MessagePattern(MESSAGE_PATTERNS.DELETE_CUSTOMER)
  async deleteCustomer(@Payload() customerId: string) {
    return this.customerServiceService.deleteCustomer(customerId);
  }

  /**
   * Search customers with filters
   */
  @MessagePattern(MESSAGE_PATTERNS.SEARCH_CUSTOMERS)
  async searchCustomers(@Payload() query: CustomerQueryDto) {
    return this.customerServiceService.searchCustomers(query);
  }

  /**
   * Validate customer for order creation
   */
  @MessagePattern(MESSAGE_PATTERNS.VALIDATE_CUSTOMER)
  async validateCustomer(@Payload() customerId: string) {
    return this.customerServiceService.validateCustomer(customerId);
  }
}
