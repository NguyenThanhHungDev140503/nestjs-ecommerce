import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerStatus } from '../../interfaces/customer.interface';

export class CustomerQueryDto {
  @ApiPropertyOptional({
    description: 'Tìm kiếm theo email',
    example: 'nguyenvana@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Tìm kiếm theo tên (partial match)',
    example: 'Nguyễn',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái',
    enum: CustomerStatus,
    example: CustomerStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({
    description: 'Số trang (bắt đầu từ 1)',
    example: 1,
  })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Số lượng kết quả mỗi trang',
    example: 10,
  })
  @IsOptional()
  limit?: number;
}

