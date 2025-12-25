import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ReserveStockItemDto {
  @ApiProperty({
    description: 'ID sản phẩm',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  product_id: string;

  @ApiProperty({
    description: 'Số lượng cần reserve',
    example: 5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Số lượng phải ít nhất là 1' })
  quantity: number;
}

export class ReserveStockDto {
  @ApiPropertyOptional({
    description: 'ID đơn hàng (nếu có)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsString()
  order_id?: string;

  @ApiProperty({
    description: 'Danh sách sản phẩm cần reserve',
    type: [ReserveStockItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReserveStockItemDto)
  items: ReserveStockItemDto[];

  @ApiPropertyOptional({
    description: 'Thời gian hết hạn reservation (ISO string)',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsString()
  expires_at?: string;
}

export class ReleaseStockDto {
  @ApiPropertyOptional({
    description: 'ID đơn hàng để release tất cả reservations',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsString()
  order_id?: string;

  @ApiPropertyOptional({
    description: 'Danh sách reservation IDs để release',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  reservation_ids?: string[];
}

export class CheckAvailabilityDto {
  @ApiProperty({
    description: 'Danh sách sản phẩm cần kiểm tra',
    type: [ReserveStockItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReserveStockItemDto)
  items: ReserveStockItemDto[];
}

