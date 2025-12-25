import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: 'Tên sản phẩm',
    example: 'iPhone 15 Pro Max',
  })
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Giá sản phẩm',
    example: 29990000,
  })
  @IsNotEmpty({ message: 'Giá sản phẩm không được để trống' })
  @IsNumber()
  @IsPositive({ message: 'Giá phải là số dương' })
  unit_price: number;

  @ApiProperty({
    description: 'Số lượng tồn kho',
    example: 100,
  })
  @IsNotEmpty({ message: 'Số lượng không được để trống' })
  @IsNumber()
  @Min(0, { message: 'Số lượng không thể âm' })
  available_quantity: number;

  @ApiPropertyOptional({
    description: 'Mô tả sản phẩm',
    example: 'Điện thoại iPhone 15 Pro Max 256GB',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Ngưỡng cảnh báo tồn kho thấp',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  low_stock_threshold?: number;
}

