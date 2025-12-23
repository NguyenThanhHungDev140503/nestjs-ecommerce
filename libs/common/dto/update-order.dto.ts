import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../constants/order-status';

export class UpdateOrderDto {
  @ApiPropertyOptional({
    description: 'ID của đơn hàng (tùy chọn)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String
  })
  @IsOptional()
  @IsString()
  orderId: string;

  @ApiPropertyOptional({
    description: 'Trạng thái mới của đơn hàng',
    enum: OrderStatus,
    example: OrderStatus.PROCESSING,
    enumName: 'OrderStatus'
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({
    description: 'Mã tracking vận chuyển',
    example: 'TRACK123456',
    type: String
  })
  @IsString()
  @IsOptional()
  trackingNumber: string;

  @ApiPropertyOptional({
    description: 'Tên công ty vận chuyển',
    example: 'DHL Express',
    type: String
  })
  @IsString()
  @IsOptional()
  trackingCompany: string;
}