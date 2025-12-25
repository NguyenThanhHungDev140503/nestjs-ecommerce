import { Test, TestingModule } from '@nestjs/testing';
import { CustomerServiceService } from './customer-service.service';
import { PrismaService } from 'libs/common/database/prisma.service';
import { RpcException } from '@nestjs/microservices';
import { CustomerStatus } from 'libs/common/interfaces/customer.interface';

describe('CustomerServiceService', () => {
  let service: CustomerServiceService;
  let prisma: PrismaService;

  const mockPrismaService = {
    customer: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    order: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerServiceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CustomerServiceService>(CustomerServiceService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCustomer', () => {
    const createDto = {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '+84901234567',
    };

    it('should create a customer successfully', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);
      mockPrismaService.customer.create.mockResolvedValue({
        id: 'test-id',
        ...createDto,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.createCustomer(createDto);

      expect(result).toHaveProperty('id', 'test-id');
      expect(result).toHaveProperty('name', 'Test Customer');
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should throw error if email already exists', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'existing-id',
        email: 'test@example.com',
      });

      await expect(service.createCustomer(createDto)).rejects.toThrow(RpcException);
    });
  });

  describe('getCustomerById', () => {
    it('should return customer if found', async () => {
      const mockCustomer = {
        id: 'test-id',
        name: 'Test Customer',
        email: 'test@example.com',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      const result = await service.getCustomerById('test-id');

      expect(result).toHaveProperty('id', 'test-id');
      expect(result).toHaveProperty('name', 'Test Customer');
    });

    it('should throw error if customer not found', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.getCustomerById('non-existent')).rejects.toThrow(RpcException);
    });
  });

  describe('validateCustomer', () => {
    it('should return valid for active customer', async () => {
      const mockCustomer = {
        id: 'test-id',
        name: 'Test Customer',
        email: 'test@example.com',
        status: 'ACTIVE',
        role: 'CUSTOMER',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      const result = await service.validateCustomer('test-id');

      expect(result.is_valid).toBe(true);
      expect(result.customer).toBeDefined();
    });

    it('should return invalid for inactive customer', async () => {
      const mockCustomer = {
        id: 'test-id',
        name: 'Test Customer',
        email: 'test@example.com',
        status: 'INACTIVE',
        role: 'CUSTOMER',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      const result = await service.validateCustomer('test-id');

      expect(result.is_valid).toBe(false);
      expect(result.error).toContain('INACTIVE');
    });

    it('should return invalid if customer not found', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      const result = await service.validateCustomer('non-existent');

      expect(result.is_valid).toBe(false);
      expect(result.error).toContain('Không tìm thấy');
    });
  });

  describe('deleteCustomer', () => {
    it('should soft delete customer with orders', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'test-id',
        status: 'ACTIVE',
      });
      mockPrismaService.order.count.mockResolvedValue(5);
      mockPrismaService.customer.update.mockResolvedValue({
        id: 'test-id',
        status: 'INACTIVE',
      });

      const result = await service.deleteCustomer('test-id');

      expect(result.success).toBe(true);
      expect(result.message).toContain('vô hiệu hóa');
      expect(mockPrismaService.customer.update).toHaveBeenCalled();
    });

    it('should hard delete customer without orders', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue({
        id: 'test-id',
        status: 'ACTIVE',
      });
      mockPrismaService.order.count.mockResolvedValue(0);
      mockPrismaService.customer.delete.mockResolvedValue({});

      const result = await service.deleteCustomer('test-id');

      expect(result.success).toBe(true);
      expect(result.message).toContain('xóa thành công');
      expect(mockPrismaService.customer.delete).toHaveBeenCalled();
    });
  });
});

