import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../libs/common/src/cache/cache.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';

// Mock Cache Manager
const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  reset: jest.fn(),
};

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return cached value', async () => {
      const key = 'test-key';
      const value = { id: 1, name: 'Test' };
      
      mockCacheManager.get.mockResolvedValue(value);
      
      const result = await service.get(key);
      
      expect(result).toEqual(value);
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it('should return null when value is not cached', async () => {
      const key = 'test-key';
      
      mockCacheManager.get.mockResolvedValue(null);
      
      const result = await service.get(key);
      
      expect(result).toBeNull();
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });
  });

  describe('set', () => {
    it('should set value in cache', async () => {
      const key = 'test-key';
      const value = { id: 1, name: 'Test' };
      const ttl = 60000;
      
      await service.set(key, value, ttl);
      
      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, ttl);
    });
  });
});
