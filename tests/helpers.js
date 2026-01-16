/**
 * Test Helper Functions
 * Provides utility functions for testing
 */

/**
 * Generate mock user data
 * @param {object} overrides - Partial user object to override defaults
 * @returns {object} Mock user object
 */
export const createMockUser = (overrides = {}) => {
  return {
    _id: 'user-123',
    email: 'testuser@example.com',
    password: 'hashedPassword123',
    firstName: 'Test',
    lastName: 'User',
    phone: '+1234567890',
    isActive: true,
    role: 'user',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-14'),
    ...overrides
  };
};

/**
 * Generate mock product data
 * @param {object} overrides - Partial product object to override defaults
 * @returns {object} Mock product object
 */
export const createMockProduct = (overrides = {}) => {
  return {
    _id: 'product-123',
    name: 'Test Product',
    description: 'A test product description',
    price: 99.99,
    discountPrice: 79.99,
    category: 'category-123',
    brand: 'Test Brand',
    stock: 100,
    images: ['https://example.com/image1.jpg'],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [{ name: 'Red', quantity: 50 }],
    isFeatured: false,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-14'),
    ratings: {
      average: 4.5,
      count: 10
    },
    reviews: [],
    ...overrides
  };
};

/**
 * Generate mock category data
 * @param {object} overrides - Partial category object to override defaults
 * @returns {object} Mock category object
 */
export const createMockCategory = (overrides = {}) => {
  return {
    _id: 'category-123',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic products',
    icon: 'https://example.com/icon.png',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-14'),
    ...overrides
  };
};

/**
 * Generate mock order data
 * @param {object} overrides - Partial order object to override defaults
 * @returns {object} Mock order object
 */
export const createMockOrder = (overrides = {}) => {
  return {
    _id: 'order-123',
    orderNumber: 'ORD-2024-001',
    user: 'user-123',
    items: [
      {
        product: 'product-123',
        quantity: 2,
        price: 99.99,
        size: 'M',
        color: 'Red'
      }
    ],
    totalAmount: 199.98,
    shippingAddress: {
      street: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62701',
      country: 'USA'
    },
    status: 'pending',
    paymentStatus: 'paid',
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-14'),
    ...overrides
  };
};

/**
 * Generate valid JWT token
 * @returns {string} Mock JWT token
 */
export const generateMockToken = () => {
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXItMTIzIiwiaWF0IjoxNjA1MzAwMDAwLCJleHAiOjE2MDUzODY0MDB9.mock-token-signature';
};

/**
 * Create axios response mock
 * @param {object} data - Response data
 * @param {number} status - HTTP status code
 * @returns {object} Mock axios response
 */
export const createAxiosResponse = (data, status = 200) => {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {}
  };
};

/**
 * Create axios error mock
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {object} Mock axios error
 */
export const createAxiosError = (message, status = 400) => {
  const error = new Error(message);
  error.response = {
    status,
    data: { success: false, message }
  };
  return error;
};

/**
 * Wait for a specified time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after specified time
 */
export const wait = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Create mock validation error
 * @param {string} field - Field name
 * @param {string} message - Error message
 * @returns {object} Mock validation error
 */
export const createValidationError = (field, message) => {
  return {
    field,
    message,
    value: undefined
  };
};

export default {
  createMockUser,
  createMockProduct,
  createMockCategory,
  createMockOrder,
  generateMockToken,
  createAxiosResponse,
  createAxiosError,
  wait,
  createValidationError
};
