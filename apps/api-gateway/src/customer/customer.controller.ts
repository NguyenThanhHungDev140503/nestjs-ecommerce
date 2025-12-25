import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { CustomerGatewayService } from './customer.service';
import { CreateCustomerDto } from 'libs/common/dto/customer/create-customer.dto';
import { UpdateCustomerDto } from 'libs/common/dto/customer/update-customer.dto';
import { CustomerQueryDto } from 'libs/common/dto/customer/customer-query.dto';
import { lastValueFrom } from 'rxjs';

@ApiTags('Customers')
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerGatewayService) {}

  @Get()
  @ApiOperation({
    summary: 'Tìm kiếm khách hàng',
    description: 'Tìm kiếm và lọc danh sách khách hàng theo các tiêu chí',
  })
  @ApiQuery({ name: 'email', required: false, description: 'Lọc theo email' })
  @ApiQuery({ name: 'name', required: false, description: 'Lọc theo tên' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Danh sách khách hàng' })
  async searchCustomers(@Query() query: CustomerQueryDto) {
    try {
      const result = await lastValueFrom(this.customerService.searchCustomers(query));
      return { status: 'success', data: result };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: error.message || 'Failed to search customers' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin khách hàng theo ID' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Thông tin khách hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khách hàng' })
  async getCustomerById(@Param('id') id: string) {
    try {
      const customer = await lastValueFrom(this.customerService.getCustomerById(id));
      return { status: 'success', data: customer };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: error.message || 'Customer not found' },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Post()
  @ApiOperation({ summary: 'Tạo khách hàng mới' })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({ status: 201, description: 'Khách hàng được tạo thành công' })
  @ApiResponse({ status: 409, description: 'Email đã tồn tại' })
  async createCustomer(@Body() dto: CreateCustomerDto) {
    try {
      const customer = await lastValueFrom(this.customerService.createCustomer(dto));
      return { status: 'success', message: 'Customer created', data: customer };
    } catch (error) {
      const statusCode = error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        { status: 'error', message: error.message || 'Failed to create customer' },
        statusCode,
      );
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin khách hàng' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiBody({ type: UpdateCustomerDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateCustomer(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    try {
      const customer = await lastValueFrom(this.customerService.updateCustomer(id, dto));
      return { status: 'success', message: 'Customer updated', data: customer };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: error.message || 'Failed to update customer' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa khách hàng' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async deleteCustomer(@Param('id') id: string) {
    try {
      const result = await lastValueFrom(this.customerService.deleteCustomer(id));
      return { status: 'success', ...result };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: error.message || 'Failed to delete customer' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

