import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerRole, CustomerStatus } from '../../interfaces/customer.interface';

export class UpdateCustomerDto {
  @ApiPropertyOptional({
    description: 'Tên khách hàng',
    example: 'Nguyễn Văn B',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Email khách hàng',
    example: 'nguyenvanb@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Mật khẩu mới (tối thiểu 6 ký tự)',
    example: 'newpassword123',
    minLength: 6,
  })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password?: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại',
    example: '+84901234568',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Địa chỉ giao hàng',
    example: '456 Đường XYZ, Quận 2, TP.HCM',
  })
  @IsOptional()
  @IsString()
  shipping_address?: string;

  @ApiPropertyOptional({
    description: 'Role của khách hàng',
    enum: CustomerRole,
    example: CustomerRole.CUSTOMER,
  })
  @IsOptional()
  @IsEnum(CustomerRole, { message: 'Role không hợp lệ' })
  role?: CustomerRole;

  @ApiPropertyOptional({
    description: 'Trạng thái tài khoản',
    enum: CustomerStatus,
    example: CustomerStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CustomerStatus, { message: 'Status không hợp lệ' })
  status?: CustomerStatus;
}

