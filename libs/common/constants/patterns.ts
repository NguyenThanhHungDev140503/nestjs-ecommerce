//Convention used: domain.action.entity
export const EVENT_PATTERNS = {
  // Order events
  CREATE_ORDER: 'order.create',
  ORDER_CREATED: 'order.created',
  ORDER_CANCELLED: 'order.cancelled',

  // Inventory events
  LOW_STOCK_ALERT: 'inventory.low_stock',
  STOCK_RESERVED: 'inventory.reserved',
  STOCK_RELEASED: 'inventory.released',
};

export const MESSAGE_PATTERNS = {
  // Order patterns
  GET_ALL_ORDERS: 'order.get.all',
  GET_ORDER_BY_ID: 'order.get',
  UPDATE_ORDER: 'order.update',
  DELETE_ORDER: 'order.delete',

  // Customer patterns
  GET_CUSTOMER_DETAILS: 'customer.get',
  CREATE_CUSTOMER: 'customer.create',
  UPDATE_CUSTOMER: 'customer.update',
  DELETE_CUSTOMER: 'customer.delete',
  SEARCH_CUSTOMERS: 'customer.search',
  VALIDATE_CUSTOMER: 'customer.validate',

  // Inventory/Product patterns
  GET_INVENTORY_DETAILS: 'inventory.get',
  CREATE_PRODUCT: 'product.create',
  UPDATE_PRODUCT: 'product.update',
  DELETE_PRODUCT: 'product.delete',
  GET_PRODUCT: 'product.get',
  SEARCH_PRODUCTS: 'product.search',

  // Stock management patterns
  RESERVE_STOCK: 'inventory.reserve',
  RELEASE_STOCK: 'inventory.release',
  CHECK_AVAILABILITY: 'inventory.check',
  CONFIRM_RESERVATION: 'inventory.confirm',
};
