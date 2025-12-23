import { Type } from 'class-transformer';
import { IsString, IsArray, ValidateNested, IsOptional, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemDto {
    @ApiProperty({
        description: 'ID của sản phẩm',
        example: 'prod-001',
        type: String
    })
    @IsString()
    @IsNotEmpty()
    productId: string;

    @ApiProperty({
        description: 'Số lượng sản phẩm',
        example: 2,
        type: Number,
        minimum: 1
    })
    @IsNumber()
    @IsNotEmpty()
    quantity: number;
}

export class CreateOrderDto {
    @ApiPropertyOptional({
        description: 'ID của khách hàng đặt hàng',
        example: 'cust-001',
        type: String
    })
    @IsString()
    @IsOptional()
    customerId: string;

    @ApiProperty({
        description: 'Danh sách sản phẩm trong đơn hàng',
        type: [OrderItemDto],
        example: [
            {
                productId: 'prod-001',
                quantity: 2
            },
            {
                productId: 'prod-002',
                quantity: 1
            }
        ]
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    @ApiPropertyOptional({
        description: 'Địa chỉ giao hàng',
        example: '123 Main St, City, Country',
        type: String
    })
    @IsString()
    @IsOptional()
    shippingAddress: string;

    @ApiPropertyOptional({
        description: 'Thông tin tracking (nếu có)',
        example: 'TRACK123456',
        type: String
    })
    @IsString()
    @IsOptional()
    trackingInfo?: string;
}
