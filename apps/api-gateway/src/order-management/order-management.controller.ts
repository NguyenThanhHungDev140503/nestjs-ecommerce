import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Delete,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { OrderManagementService } from './order-management.service';
import { CreateOrderDto } from 'libs/common/dto/create-order.dto';
import { UpdateOrderDto } from 'libs/common/dto/update-order.dto';
import { lastValueFrom } from 'rxjs';

@ApiTags('Orders')
@Controller('orders')
export class OrderManagementController {
  constructor(private readonly orderManagementService: OrderManagementService) {}

  @Get('health-check')
  @ApiOperation({
    summary: 'Kiểm tra trạng thái hệ thống',
    description: 'Endpoint để kiểm tra API Gateway đang hoạt động bình thường'
  })
  @ApiResponse({
    status: 200,
    description: 'Hệ thống hoạt động bình thường',
    schema: {
      example: {
        status: 'success',
        message: 'Health-Check Successful',
        data: null
      }
    }
  })
  healthCheck() {
    console.log('Received Health Check request');
    return { status: 'success', message: 'Health-Check Successful', data: null };
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách tất cả đơn hàng',
    description: 'Trả về danh sách tất cả các đơn hàng trong hệ thống'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách đơn hàng thành công',
    schema: {
      example: {
        status: 'success',
        message: 'Orders fetched successfully',
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            customerId: 'cust-001',
            status: 'PENDING',
            items: [
              {
                productId: 'prod-001',
                quantity: 2
              }
            ],
            shippingAddress: '123 Main St, City',
            createdAt: '2024-01-01T00:00:00.000Z'
          }
        ]
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi server khi lấy danh sách đơn hàng',
    schema: {
      example: {
        status: 'error',
        message: 'An unknown error occurred',
        data: null
      }
    }
  })
  async getAllOrders() {
    console.log('Received Order Fetch request');
    try {
      const orders = await lastValueFrom(this.orderManagementService.getAllOrders('mockToken'));
      console.log('Orders:', orders);
      return { status: 'success', message: 'Orders fetched successfully', data: orders };
    } catch (error) {
      console.error('Error fetching orders:', error.message);
      const errorMessage = error?.message || 'An unknown error occurred';
      throw new HttpException(
        {
          status: 'error',
          message: errorMessage,
          data: null,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy thông tin đơn hàng theo ID',
    description: 'Trả về thông tin chi tiết của một đơn hàng dựa trên ID'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của đơn hàng cần lấy thông tin',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thông tin đơn hàng thành công',
    schema: {
      example: {
        status: 'success',
        message: 'Order fetched successfully',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          customerId: 'cust-001',
          status: 'PENDING',
          items: [
            {
              productId: 'prod-001',
              quantity: 2
            }
          ],
          shippingAddress: '123 Main St, City',
          createdAt: '2024-01-01T00:00:00.000Z'
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn hàng',
    schema: {
      example: {
        status: 'error',
        message: 'Order not found',
        data: null
      }
    }
  })
  async getOrderById(@Param('id') orderId: string) {
    console.log('Received Order Fetch request for ID:', orderId);
    try {
      const order = await lastValueFrom(
        this.orderManagementService.getOrderById(orderId, 'mockToken')
      );
      return { status: 'success', message: 'Order fetched successfully', data: order };
    } catch (error) {
      console.error('Error fetching order:', error.message);
      const errorMessage = error?.message || 'An unknown error occurred';
      throw new HttpException(
        {
          status: 'error',
          message: errorMessage,
          data: null,
        },
        HttpStatus.NOT_FOUND
      );
    }
  }

  @Post()
  @ApiOperation({
    summary: 'Tạo đơn hàng mới',
    description: 'Tạo một đơn hàng mới trong hệ thống với thông tin khách hàng và sản phẩm'
  })
  @ApiBody({
    type: CreateOrderDto,
    description: 'Thông tin đơn hàng cần tạo',
    examples: {
      example1: {
        summary: 'Đơn hàng cơ bản',
        value: {
          customerId: 'cust-001',
          items: [
            {
              productId: 'prod-001',
              quantity: 2
            },
            {
              productId: 'prod-002',
              quantity: 1
            }
          ],
          shippingAddress: '123 Main St, City, Country'
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo đơn hàng thành công',
    schema: {
      example: {
        status: 'success',
        message: 'Order created successfully',
        data: null
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi server khi tạo đơn hàng',
    schema: {
      example: {
        status: 'error',
        message: 'An unknown error occurred',
        data: null
      }
    }
  })
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    console.log('Received Order Creation request:', createOrderDto);
    try {
      this.orderManagementService.createOrder(createOrderDto, 'mockToken');
      return { status: 'success', message: 'Order created successfully', data: null};
    } catch (error) {
      console.error('Error creating order:', error.message);
      const errorMessage = error?.message || 'An unknown error occurred';
      throw new HttpException(
        {
          status: 'error',
          message: errorMessage,
          data: null,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật thông tin đơn hàng',
    description: 'Cập nhật trạng thái hoặc thông tin tracking của đơn hàng'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của đơn hàng cần cập nhật',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String
  })
  @ApiBody({
    type: UpdateOrderDto,
    description: 'Thông tin cần cập nhật cho đơn hàng',
    examples: {
      updateStatus: {
        summary: 'Cập nhật trạng thái',
        value: {
          status: 'PROCESSING'
        }
      },
      updateTracking: {
        summary: 'Cập nhật thông tin vận chuyển',
        value: {
          trackingNumber: 'TRACK123456',
          trackingCompany: 'DHL Express'
        }
      },
      updateAll: {
        summary: 'Cập nhật đầy đủ',
        value: {
          status: 'SHIPPED',
          trackingNumber: 'TRACK123456',
          trackingCompany: 'DHL Express'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật đơn hàng thành công',
    schema: {
      example: {
        status: 'success',
        message: 'Order updated successfully',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          status: 'PROCESSING',
          trackingNumber: 'TRACK123456',
          trackingCompany: 'DHL Express'
        }
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi server khi cập nhật đơn hàng',
    schema: {
      example: {
        status: 'error',
        message: 'An unknown error occurred',
        data: null
      }
    }
  })
  async updateOrder(@Param('id') orderId: string, @Body() updateOrderDto: UpdateOrderDto) {
    console.log('Received Order Update request for ID:', orderId);
    try {
      const order = await lastValueFrom(this.orderManagementService.updateOrder(orderId, updateOrderDto, 'mockToken'));
      return { status: 'success', message: 'Order updated successfully', data: order };
    } catch (error) {
      console.error('Error updating order:', error.message);
      const errorMessage = error?.message || 'An unknown error occurred';
      throw new HttpException(
        {
          status: 'error',
          message: errorMessage,
          data: null,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa đơn hàng',
    description: 'Xóa một đơn hàng khỏi hệ thống dựa trên ID'
  })
  @ApiParam({
    name: 'id',
    description: 'ID của đơn hàng cần xóa',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa đơn hàng thành công',
    schema: {
      example: {
        status: 'success',
        message: 'Order deleted successfully',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          deleted: true
        }
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Lỗi server khi xóa đơn hàng',
    schema: {
      example: {
        status: 'error',
        message: 'An unknown error occurred',
        data: null
      }
    }
  })
  async deleteOrder(@Param('id') orderId: string) {
    console.log('Received Order Delete request for ID:', orderId);
    try {
      const order = await lastValueFrom(this.orderManagementService.deleteOrder(orderId, 'mockToken'));
      return { status: 'success', message: 'Order deleted successfully', data: order };
    } catch (error) {
      console.error('Error deleting order:', error.message);
      const errorMessage = error?.message || 'An unknown error occurred';
      throw new HttpException(
        {
          status: 'error',
          message: errorMessage,
          data: null,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
