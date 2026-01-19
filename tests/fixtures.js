import User from '../models/User.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';

/**
 * Test Fixtures for E-commerce Application
 * Provides sample data for testing
 */

// User Fixtures
export const validUserData = {
  email: 'test@example.com',
  password: 'Test@1234',
  firstName: 'John',
  lastName: 'Doe',
  phone: '1234567890',
  role: 'user'
};

export const validAdminData = {
  email: 'admin@example.com',
  password: 'Admin@1234',
  firstName: 'Admin',
  lastName: 'User',
  phone: '9876543210',
  role: 'admin'
};

export const validSuperAdminData = {
  email: 'superadmin@example.com',
  password: 'SuperAdmin@1234',
  firstName: 'Super',
  lastName: 'Admin',
  phone: '5555555555',
  role: 'superadmin'
};

export const invalidUserData = {
  email: 'invalid-email',
  password: 'weak',
  firstName: '',
  lastName: ''
};

// Category Fixtures
export const validCategoryData = {
  name: 'Electronics',
  description: 'Electronic items and gadgets',
  slug: 'electronics',
  isActive: true
};

export const anotherCategoryData = {
  name: 'Clothing',
  description: 'Apparel and fashion items',
  slug: 'clothing',
  isActive: true
};

// Product Fixtures
export const validProductData = {
  name: 'Wireless Headphones',
  description: 'High-quality wireless headphones with noise cancellation',
  price: 199.99,
  comparePrice: 249.99,
  category: null, // Will be set when creating
  sku: 'WH-001',
  stock: 50,
  images: ['https://example.com/headphones.jpg'],
  specifications: {
    brand: 'AudioTech',
    warranty: '1 year',
    color: 'Black'
  },
  isActive: true,
  isFeatured: true
};

export const anotherProductData = {
  name: 'Smart Watch',
  description: 'Feature-rich smartwatch with health tracking',
  price: 299.99,
  comparePrice: 399.99,
  category: null, // Will be set when creating
  sku: 'SW-002',
  stock: 30,
  images: ['https://example.com/smartwatch.jpg'],
  specifications: {
    brand: 'TechWear',
    warranty: '2 years',
    color: 'Silver'
  },
  isActive: true,
  isFeatured: false
};

export const outOfStockProductData = {
  name: 'Limited Edition Item',
  description: 'Rare collectible item',
  price: 499.99,
  category: null,
  sku: 'LE-003',
  stock: 0,
  images: ['https://example.com/limited.jpg'],
  isActive: true
};

// Coupon Fixtures
export const validCouponData = {
  code: 'SAVE20',
  description: '20% off on all products',
  type: 'percentage',
  value: 20,
  minOrderValue: 100,
  maxDiscount: 50,
  validFrom: new Date(),
  validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  usageLimit: 100,
  usedCount: 0,
  isActive: true
};

export const fixedCouponData = {
  code: 'FLAT50',
  description: 'Flat $50 off',
  type: 'fixed',
  value: 50,
  minOrderValue: 200,
  validFrom: new Date(),
  validTo: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
  usageLimit: 50,
  usedCount: 0,
  isActive: true
};

export const expiredCouponData = {
  code: 'EXPIRED10',
  description: 'Expired coupon',
  type: 'percentage',
  value: 10,
  minOrderValue: 50,
  validFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
  validTo: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
  usageLimit: 100,
  usedCount: 0,
  isActive: true
};

// Order Fixtures
export const validOrderData = {
  user: null, // Will be set when creating
  items: [],
  shippingAddress: {
    firstName: 'John',
    lastName: 'Doe',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
    phone: '1234567890'
  },
  paymentMethod: 'card',
  paymentStatus: 'pending',
  orderStatus: 'pending',
  subtotal: 0,
  tax: 0,
  shippingCost: 10,
  total: 0
};

// Payment Fixtures
export const validPaymentData = {
  order: null, // Will be set when creating
  user: null, // Will be set when creating
  amount: 199.99,
  currency: 'USD',
  paymentMethod: 'card',
  status: 'pending',
  transactionId: 'txn_test_123456',
  paymentDetails: {
    cardLast4: '4242',
    cardBrand: 'visa'
  }
};

// Inventory Adjustment Fixtures
export const validInventoryAdjustmentData = {
  product: null, // Will be set when creating
  type: 'adjustment',
  quantity: 10,
  reason: 'Stock replenishment',
  adjustedBy: null, // Will be set when creating
  notes: 'Restocking from supplier'
};

// Helper Functions to Create Test Data

/**
 * Create a test user
 */
export const createTestUser = async (userData = validUserData) => {
  const user = await User.create(userData);
  return user;
};

/**
 * Create a test admin user
 */
export const createTestAdmin = async (userData = validAdminData) => {
  const admin = await User.create(userData);
  return admin;
};

/**
 * Create a test superadmin user
 */
export const createTestSuperAdmin = async (userData = validSuperAdminData) => {
  const superadmin = await User.create(userData);
  return superadmin;
};

/**
 * Create a test category
 */
export const createTestCategory = async (categoryData = validCategoryData) => {
  const category = await Category.create(categoryData);
  return category;
};

/**
 * Create a test product
 */
export const createTestProduct = async (productData = validProductData, category = null) => {
  if (!category) {
    category = await createTestCategory();
  }

  const product = await Product.create({
    ...productData,
    category: category._id
  });

  return product;
};

/**
 * Create a test coupon
 */
export const createTestCoupon = async (couponData = validCouponData) => {
  const coupon = await Coupon.create(couponData);
  return coupon;
};

/**
 * Create a test order
 */
export const createTestOrder = async (user, products = []) => {
  const items = products.map(product => ({
    product: product._id,
    name: product.name,
    price: product.price,
    quantity: 1,
    image: product.images[0]
  }));

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax + validOrderData.shippingCost;

  const order = await Order.create({
    ...validOrderData,
    user: user._id,
    items,
    subtotal,
    tax,
    total
  });

  return order;
};

/**
 * Generate auth token for testing
 */
export const getAuthToken = (user) => {
  // This would use your actual token generation function
  // For now, we'll import it from the utils
  const { generateAccessToken } = require('../utils/generateToken.js');
  return generateAccessToken(user._id, user.role);
};

/**
 * Create multiple test products
 */
export const createMultipleProducts = async (count = 5, category = null) => {
  if (!category) {
    category = await createTestCategory();
  }

  const products = [];
  for (let i = 0; i < count; i++) {
    const product = await createTestProduct({
      ...validProductData,
      name: `${validProductData.name} ${i + 1}`,
      sku: `WH-00${i + 1}`,
      price: 199.99 + (i * 10)
    }, category);
    products.push(product);
  }

  return products;
};

/**
 * Clean up all test data
 */
export const cleanupTestData = async () => {
  await User.deleteMany({});
  await Product.deleteMany({});
  await Category.deleteMany({});
  await Coupon.deleteMany({});
  await Order.deleteMany({});
};
