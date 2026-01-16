# Testing Quick Reference

A quick guide to common testing commands and patterns for the ValidateSharing project.

## Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- tests/auth.test.js

# Run tests matching a pattern
npm test -- -t "login"

# Run linter
npm run lint

# Fix linting issues
npm run lint -- --fix

# Run linter on specific file
npm run lint -- tests/auth.test.js
```

## Test File Template

```javascript
import request from 'supertest';
import express from 'express';
import routes from '../routes/[feature]Routes.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

jest.mock('../models/[Model].js');
jest.mock('../utils/apiResponse.js');

const app = express();
app.use(express.json());
app.use('/api/[feature]', routes);

describe('[Feature] Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendSuccess.mockImplementation((res, status, data, message) => {
      res.status(status).json({ success: true, data, message });
    });
  });

  describe('GET /api/[feature]', () => {
    it('should fetch all items', async () => {
      const response = await request(app)
        .get('/api/[feature]');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
```

## Mock Examples

### Mocking Models

```javascript
import User from '../models/User.js';
jest.mock('../models/User.js');

// In test
User.findOne.mockResolvedValue({ _id: '123', email: 'user@example.com' });

// For error
User.findOne.mockRejectedValue(new Error('Database error'));

// For array
User.find.mockResolvedValue([{ _id: '123' }, { _id: '456' }]);
```

### Mocking Middleware

```javascript
import { protect } from '../middleware/auth.js';
jest.mock('../middleware/auth.js');

protect.mockImplementation((req, res, next) => {
  req.user = { _id: 'user-123', role: 'admin' };
  next();
});
```

### Mocking Utilities

```javascript
import { generateAccessToken } from '../utils/generateToken.js';
jest.mock('../utils/generateToken.js');

generateAccessToken.mockReturnValue('mock-token');
```

## Common Assertions

```javascript
// Status codes
expect(response.status).toBe(200);
expect(response.status).toBeLessThan(400);
expect(response.status).toBeGreaterThan(199);

// Response body
expect(response.body).toHaveProperty('success', true);
expect(response.body.data).toBeDefined();
expect(response.body.message).toContain('successfully');
expect(response.body).toEqual(expectedData);

// Arrays
expect(response.body.data).toHaveLength(5);
expect(response.body.data).toContainEqual({ id: 1, name: 'Item' });

// Objects
expect(response.body.data).toHaveProperty('_id');
expect(response.body.data._id).toBe('product-123');

// Mocks
expect(User.findOne).toHaveBeenCalled();
expect(User.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
expect(User.findOne).toHaveBeenCalledTimes(1);
expect(User.create).not.toHaveBeenCalled();
```

## Test Patterns

### Testing GET Endpoint

```javascript
it('should fetch item by ID', async () => {
  const mockData = { _id: '123', name: 'Test Item' };
  Model.findById.mockResolvedValue(mockData);

  const response = await request(app)
    .get('/api/items/123');

  expect(response.status).toBe(200);
  expect(response.body.data).toEqual(mockData);
});
```

### Testing POST Endpoint

```javascript
it('should create new item', async () => {
  const inputData = { name: 'New Item', price: 99.99 };
  const mockResponse = { _id: 'new-123', ...inputData };
  Model.create.mockResolvedValue(mockResponse);

  const response = await request(app)
    .post('/api/items')
    .send(inputData);

  expect(response.status).toBe(201);
  expect(Model.create).toHaveBeenCalledWith(inputData);
});
```

### Testing PUT Endpoint

```javascript
it('should update item', async () => {
  const updateData = { name: 'Updated Name' };
  const mockItem = { _id: '123', name: 'Original' };
  const mockUpdated = { _id: '123', ...updateData };

  Model.findById.mockResolvedValue(mockItem);
  mockItem.save.mockResolvedValue(mockUpdated);

  const response = await request(app)
    .put('/api/items/123')
    .send(updateData);

  expect(response.status).toBe(200);
  expect(mockItem.save).toHaveBeenCalled();
});
```

### Testing DELETE Endpoint

```javascript
it('should delete item', async () => {
  const mockItem = { _id: '123', deleteOne: jest.fn() };
  Model.findById.mockResolvedValue(mockItem);

  const response = await request(app)
    .delete('/api/items/123');

  expect(response.status).toBe(200);
  expect(mockItem.deleteOne).toHaveBeenCalled();
});
```

### Testing Protected Routes

```javascript
it('should require authentication', async () => {
  protect.mockImplementationOnce((req, res, next) => {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  });

  const response = await request(app)
    .get('/api/protected-route');

  expect(response.status).toBe(401);
});
```

### Testing Error Cases

```javascript
it('should handle not found error', async () => {
  Model.findById.mockResolvedValue(null);

  const response = await request(app)
    .get('/api/items/nonexistent');

  expect(response.status).toBe(404);
  expect(response.body.success).toBe(false);
});

it('should handle database error', async () => {
  Model.find.mockRejectedValue(new Error('Connection failed'));

  const response = await request(app)
    .get('/api/items');

  expect(response.status).toBe(500);
});
```

### Testing Filters and Pagination

```javascript
it('should filter items by category', async () => {
  const mockItems = [{ category: 'electronics' }];
  Model.find.mockReturnValue({
    populate: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          skip: jest.fn().mockResolvedValue(mockItems)
        })
      })
    })
  });

  const response = await request(app)
    .get('/api/items?category=electronics');

  expect(response.status).toBe(200);
});
```

## Helper Functions Usage

```javascript
import {
  createMockUser,
  createMockProduct,
  createMockOrder
} from './helpers.js';

// Create with defaults
const user = createMockUser();

// Override specific fields
const admin = createMockUser({ role: 'admin' });
const product = createMockProduct({ price: 199.99, isFeatured: true });
const order = createMockOrder({ status: 'shipped' });
```

## Coverage Commands

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html

# Coverage for specific file
npm run test:coverage -- tests/auth.test.js
```

## ESLint Commands

```bash
# Check for linting issues
npm run lint

# Fix issues automatically
npm run lint -- --fix

# Lint specific file
npm run lint -- tests/auth.test.js

# Lint with specific severity
npm run lint -- --max-warnings 0
```

## Debugging

```bash
# Verbose output
npm test -- --verbose

# Stop on first test failure
npm test -- --bail

# Run only failed tests from last run
npm test -- --onlyChanged

# Clear Jest cache
npm test -- --clearCache

# Run with Node inspector
node --inspect-brk ./node_modules/jest/bin/jest.js --runInBand
```

## Test Naming Convention

- Test files: `[feature].test.js`
- Describe blocks: Feature or endpoint name
- Test cases: Start with "should"

```javascript
describe('User Authentication', () => {
  it('should register user with valid data', () => {});
  it('should reject user with invalid email', () => {});
  it('should return 409 if user already exists', () => {});
});
```

## CI/CD Integration

Run in continuous integration:

```bash
npm test -- --coverage
npm run lint
```

## Tips

1. **Keep tests focused**: One assertion or logical group per test
2. **Mock external dependencies**: Database, APIs, file systems
3. **Use descriptive names**: "should return 404 for non-existent product"
4. **Clear mocks**: Use `beforeEach()` with `jest.clearAllMocks()`
5. **Test edge cases**: Empty arrays, null values, permissions
6. **Test errors**: Invalid input, missing fields, server errors
7. **Avoid flaky tests**: Don't use hardcoded delays, mock time if needed
8. **Review coverage**: Aim for 80%+ coverage
9. **Keep tests fast**: Mock slow operations
10. **Maintain tests**: Update tests when code changes

## Resources

- [Jest Docs](https://jestjs.io/docs/getting-started)
- [Supertest Docs](https://github.com/visionmedia/supertest)
- [Testing Guide](../docs/TESTING.md)
- [Contributing Guide](../CONTRIBUTING.md)
- [ESLint Config](.eslintrc.json)

## Troubleshooting

See [TESTING.md](../docs/TESTING.md#troubleshooting) for common issues and solutions.
