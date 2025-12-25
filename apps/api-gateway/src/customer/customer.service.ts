import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CUSTOMER_SERVICE } from 'libs/common/constants/services';
import { MESSAGE_PATTERNS } from 'libs/common/constants/patterns';
import { CreateCustomerDto } from 'libs/common/dto/customer/create-customer.dto';
import { UpdateCustomerDto } from 'libs/common/dto/customer/update-customer.dto';
import { CustomerQueryDto } from 'libs/common/dto/customer/customer-query.dto';

@Injectable()
export class CustomerGatewayService {
  constructor(
    @Inject(CUSTOMER_SERVICE) private readonly customerClient: ClientProxy,
  ) {}

  getCustomerById(customerId: string) {
    return this.customerClient.send(MESSAGE_PATTERNS.GET_CUSTOMER_DETAILS, customerId);
  }

  createCustomer(dto: CreateCustomerDto) {
    return this.customerClient.send(MESSAGE_PATTERNS.CREATE_CUSTOMER, dto);
  }

  updateCustomer(customerId: string, dto: UpdateCustomerDto) {
    return this.customerClient.send(MESSAGE_PATTERNS.UPDATE_CUSTOMER, {
      customerId,
      data: dto,
    });
  }

  deleteCustomer(customerId: string) {
    return this.customerClient.send(MESSAGE_PATTERNS.DELETE_CUSTOMER, customerId);
  }

  searchCustomers(query: CustomerQueryDto) {
    return this.customerClient.send(MESSAGE_PATTERNS.SEARCH_CUSTOMERS, query);
  }

  validateCustomer(customerId: string) {
    return this.customerClient.send(MESSAGE_PATTERNS.VALIDATE_CUSTOMER, customerId);
  }
}

