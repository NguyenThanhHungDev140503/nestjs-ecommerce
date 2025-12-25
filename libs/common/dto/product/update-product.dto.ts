import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiPropertyOptional({
    description: 'Tên sản phẩm',
    example: 'iPhone 15 Pro Max - Updated',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Giá sản phẩm',
    example: 28990000,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive({ message: 'Giá phải là số dương' })
  unit_price?: number;

  @ApiPropertyOptional({
    description: 'Số lượng tồn kho',
    example: 150,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Số lượng không thể âm' })
  available_quantity?: number;

  @ApiPropertyOptional({
    description: 'Mô tả sản phẩm',
    example: 'Điện thoại iPhone 15 Pro Max 256GB - Mô tả mới',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Ngưỡng cảnh báo tồn kho thấp',
    example: 15,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  low_stock_threshold?: number;

  @ApiPropertyOptional({
    description: 'Trạng thái hoạt động của sản phẩm',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

