import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory-service.service';
import { PrismaService } from 'libs/common/database/prisma.service';
import { RpcException } from '@nestjs/microservices';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: PrismaService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    stockReservation: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    orderLineItem: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProduct', () => {
    const createDto = {
      name: 'Test Product',
      unit_price: 100,
      available_quantity: 50,
      description: 'Test description',
    };

    it('should create a product successfully', async () => {
      mockPrismaService.product.create.mockResolvedValue({
        id: 'prod-id',
        ...createDto,
        reserved_quantity: 0,
        low_stock_threshold: 10,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.createProduct(createDto);

      expect(result).toHaveProperty('id', 'prod-id');
      expect(result).toHaveProperty('name', 'Test Product');
      expect(result.available_quantity).toBe(50);
    });
  });

  describe('getInventoryDetails', () => {
    it('should return inventory details for multiple products', async () => {
      const items = [
        { productId: 'prod-1', quantity: 5 },
        { productId: 'prod-2', quantity: 3 },
      ];

      mockPrismaService.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Product 1',
          unit_price: 100,
          available_quantity: 20,
          reserved_quantity: 5,
          low_stock_threshold: 10,
        },
        {
          id: 'prod-2',
          name: 'Product 2',
          unit_price: 200,
          available_quantity: 10,
          reserved_quantity: 2,
          low_stock_threshold: 5,
        },
      ]);

      const result = await service.getInventoryDetails(items);

      expect(result).toHaveLength(2);
      expect(result[0].is_available).toBe(true);
      expect(result[1].is_available).toBe(true);
    });

    it('should mark product as unavailable if not enough stock', async () => {
      const items = [{ productId: 'prod-1', quantity: 100 }];

      mockPrismaService.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Product 1',
          unit_price: 100,
          available_quantity: 20,
          reserved_quantity: 5,
          low_stock_threshold: 10,
        },
      ]);

      const result = await service.getInventoryDetails(items);

      expect(result[0].is_available).toBe(false);
    });

    it('should handle non-existent products', async () => {
      const items = [{ productId: 'non-existent', quantity: 5 }];

      mockPrismaService.product.findMany.mockResolvedValue([]);

      const result = await service.getInventoryDetails(items);

      expect(result[0].is_available).toBe(false);
      expect(result[0].name).toContain('not found');
    });
  });

  describe('checkAvailability', () => {
    it('should check availability correctly', async () => {
      const dto = {
        items: [
          { product_id: 'prod-1', quantity: 5 },
        ],
      };

      mockPrismaService.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Product 1',
          available_quantity: 20,
          reserved_quantity: 5,
        },
      ]);

      const result = await service.checkAvailability(dto);

      expect(result[0].is_available).toBe(true);
      expect(result[0].available_quantity).toBe(15); // 20 - 5 reserved
    });
  });
});

