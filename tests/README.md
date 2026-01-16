# Backend Tests README

This directory contains all unit and integration tests for the backend API.

## Quick Start

### Install Dependencies

```bash
cd backend
npm install
```

### Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Run Linter

```bash
# Check for linting issues
npm run lint

# Fix linting issues automatically
npm run lint -- --fix
```

## Test Structure

```
tests/
├── setup.js              # Global test setup and configuration
├── helpers.js            # Helper functions for creating mock data
├── auth.test.js          # Authentication endpoint tests
├── products.test.js      # Product endpoint tests
└── [feature].test.js     # Add new feature tests here
```

## Writing Your First Test

### 1. Create a test file

Create `tests/users.test.js`:

```javascript
import request from 'supertest';
import express from 'express';
import userRoutes from '../routes/userRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

describe('User Endpoints', () => {
  it('should fetch all users', async () => {
    const response = await request(app)
      .get('/api/users');

    expect(response.status).toBe(200);
  });
});
```

### 2. Run the test

```bash
npm test -- tests/users.test.js
```

## Testing Best Practices

### Mock External Dependencies

```javascript
import User from '../models/User.js';

jest.mock('../models/User.js');

// In your test
User.find.mockResolvedValue([{ _id: '1', name: 'John' }]);
```

### Test Async Operations

```javascript
it('should handle async operations', async () => {
  const response = await request(app).get('/api/users');
  expect(response.status).toBe(200);
});
```

### Clear Mocks Between Tests

```javascript
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Test Error Cases

```javascript
it('should return 404 for non-existent user', async () => {
  User.findById.mockResolvedValue(null);

  const response = await request(app)
    .get('/api/users/nonexistent');

  expect(response.status).toBe(404);
});
```

## Test Coverage

View coverage report:

```bash
npm run test:coverage
```

This generates:
- Console output with coverage summary
- HTML report in `coverage/lcov-report/index.html`

### Coverage Goals

- Statements: 80%+
- Branches: 75%+
- Functions: 80%+
- Lines: 80%+

## Test Helpers

Import helpers from `tests/helpers.js`:

```javascript
import {
  createMockUser,
  createMockProduct,
  createMockOrder
} from './helpers.js';

// Create mock data
const user = createMockUser({ email: 'custom@example.com' });
const product = createMockProduct({ price: 149.99 });
const order = createMockOrder({ status: 'shipped' });
```

## Debugging Tests

### Run specific test file

```bash
npm test -- tests/auth.test.js
```

### Run specific test

```bash
npm test -- -t "should login successfully"
```

### Run with verbose output

```bash
npm test -- --verbose
```

### Debug with Node

```bash
node --inspect-brk ./node_modules/jest/bin/jest.js --runInBand
```

## ESLint Configuration

The project uses ESLint to maintain code quality. Configuration is in `.eslintrc.json`.

### Supported Rules

- Indentation: 2 spaces
- Quotes: Single quotes
- Semicolons: Required
- var: Not allowed (use const/let)
- console.log: Warned (use console.warn/error for logging)
- max-line-length: 100 characters (warning)

### Fix Issues Automatically

```bash
npm run lint -- --fix
```

## Environment Variables for Testing

Tests use `.env.test` for environment variables. Key variables:

```
NODE_ENV=test
PORT=5001
MONGODB_URI=mongodb://localhost:27017/ecommerce-test
JWT_SECRET=test-secret-key
```

## Continuous Integration

Tests are run in CI/CD pipeline with:

```bash
npm test -- --coverage
npm run lint
```

Ensure all tests pass before submitting a pull request.

## Common Issues

### Tests Timeout

Increase timeout in `jest.config.js`:

```javascript
testTimeout: 10000 // milliseconds
```

Or for specific test:

```javascript
it('should handle slow operation', async () => {
  // test code
}, 15000);
```

### Mock Not Working

- Ensure mock is declared before imports
- Use `jest.clearAllMocks()` in `beforeEach()`
- Check mock path matches actual import path

### Async Issues

- Use `async` keyword for async tests
- Always `await` async operations
- Ensure all promises resolve

## Contributing

When adding new features:

1. Create tests first (TDD approach recommended)
2. Implement the feature
3. Run tests: `npm test`
4. Check coverage: `npm run test:coverage`
5. Run linter: `npm run lint`
6. All tests must pass before committing

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](../docs/TESTING.md)
- [Contributing Guide](../CONTRIBUTING.md)

## Support

For questions about testing:
1. Check the [Testing Guide](../docs/TESTING.md)
2. Review existing test examples
3. Ask in project discussions
4. Contact maintainers

---

Happy testing!
