import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpStatus,
  HttpException,
  UseInterceptors,
  CacheInterceptor,
  CacheKey,
  CacheTTL,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { ProductGatewayService } from './product.service';
import { CreateProductDto } from 'libs/common/dto/product/create-product.dto';
import { UpdateProductDto } from 'libs/common/dto/product/update-product.dto';
import { CheckAvailabilityDto } from 'libs/common/dto/product/stock.dto';
import { lastValueFrom } from 'rxjs';
import { CACHE_TTL } from 'libs/common/src/cache/cache.constants';
import { HttpCacheInterceptor } from '../interceptors/http-cache.interceptor';

@ApiTags('Products')
@Controller('products')
@UseInterceptors(HttpCacheInterceptor)
export class ProductController {
  constructor(private readonly productService: ProductGatewayService) {}

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('product-detail')
  @CacheTTL(CACHE_TTL.PRODUCTS.DETAIL)
  @ApiOperation({ summary: 'Lấy thông tin sản phẩm theo ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Thông tin sản phẩm' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  async getProductById(@Param('id') id: string) {
    try {
      const product = await lastValueFrom(this.productService.getProductById(id));
      return { status: 'success', data: product };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: error.message || 'Product not found' },
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Post()
  @ApiOperation({ summary: 'Tạo sản phẩm mới' })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: 'Sản phẩm được tạo thành công' })
  async createProduct(@Body() dto: CreateProductDto) {
    try {
      const product = await lastValueFrom(this.productService.createProduct(dto));
      return { status: 'success', message: 'Product created', data: product };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: error.message || 'Failed to create product' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin sản phẩm' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    try {
      const product = await lastValueFrom(this.productService.updateProduct(id, dto));
      return { status: 'success', message: 'Product updated', data: product };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: error.message || 'Failed to update product' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa sản phẩm' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  async deleteProduct(@Param('id') id: string) {
    try {
      const result = await lastValueFrom(this.productService.deleteProduct(id));
      return { status: 'success', ...result };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: error.message || 'Failed to delete product' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('check-availability')
  @ApiOperation({ summary: 'Kiểm tra tồn kho' })
  @ApiBody({ type: CheckAvailabilityDto })
  @ApiResponse({ status: 200, description: 'Kết quả kiểm tra tồn kho' })
  async checkAvailability(@Body() dto: CheckAvailabilityDto) {
    try {
      const result = await lastValueFrom(this.productService.checkAvailability(dto));
      return { status: 'success', data: result };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: error.message || 'Failed to check availability' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

