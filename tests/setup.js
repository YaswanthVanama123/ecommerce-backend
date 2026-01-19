import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Setup MongoDB Memory Server connection
beforeAll(async () => {
  // Close existing connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  // Connect to test database
  const mongoUri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/ecommerce-test';
  await mongoose.connect(mongoUri);
});

// Clear all collections after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Close database connection after all tests
afterAll(async () => {
  await mongoose.connection.close();
});

// Set test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in test output (optional)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep error and warn for debugging
  error: console.error,
  warn: console.warn,
};
