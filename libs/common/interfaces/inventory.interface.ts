export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  unit_price: number;
  available_quantity: number;
  reserved_quantity: number;
  requested_quantity: number;
  total_price: number;
  is_available: boolean;
  low_stock_threshold: number;
  is_low_stock: boolean;
}

export interface ProductDetails {
  id: string;
  name: string;
  description?: string;
  unit_price: number;
  available_quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface StockReservationResult {
  success: boolean;
  reservation_id?: string;
  product_id: string;
  quantity: number;
  error?: string;
}

export interface StockReleaseResult {
  success: boolean;
  released_quantity: number;
  product_id: string;
  error?: string;
}

export interface StockAvailabilityResult {
  product_id: string;
  name: string;
  requested_quantity: number;
  available_quantity: number;
  is_available: boolean;
  shortfall?: number;
}

export interface LowStockAlert {
  product_id: string;
  product_name: string;
  current_quantity: number;
  threshold: number;
  timestamp: Date;
}
