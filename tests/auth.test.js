import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/authRoutes.js';
import { protect } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import User from '../models/User.js';

// Mock User model
jest.mock('../models/User.js');

// Mock utils
jest.mock('../utils/apiResponse.js');
jest.mock('../utils/generateToken.js', () => ({
  generateAccessToken: jest.fn(() => 'mock-access-token'),
  generateRefreshToken: jest.fn(() => 'mock-refresh-token'),
  verifyAccessToken: jest.fn((token) => token === 'valid-token' ? { id: 'user-123' } : null),
  verifyRefreshToken: jest.fn((token) => token === 'valid-refresh-token' ? { id: 'user-123' } : null)
}));

jest.mock('../middleware/auth.js');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Authentication Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendSuccess.mockImplementation((res, status, data, message) => {
      res.status(status).json({ success: true, data, message });
    });
    sendError.mockImplementation((res, status, message) => {
      res.status(status).json({ success: false, message });
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'securePassword123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890'
      };

      const mockUser = {
        _id: 'user-123',
        ...userData,
        refreshToken: 'mock-refresh-token',
        toJSON: jest.fn().mockReturnValue(userData)
      };

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(User.create).toHaveBeenCalledWith(userData);
    });

    it('should not register if user already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1234567890'
      };

      User.findOne.mockResolvedValue({ email: 'existing@example.com' });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should handle registration errors', async () => {
      const userData = {
        email: 'user@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '+1234567890'
      };

      User.findOne.mockResolvedValue(null);
      User.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123'
      };

      const mockUser = {
        _id: 'user-123',
        email: 'user@example.com',
        isActive: true,
        refreshToken: 'mock-refresh-token',
        matchPassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(null),
        toJSON: jest.fn().mockReturnValue({
          _id: 'user-123',
          email: 'user@example.com'
        })
      };

      User.findOne.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(mockUser.matchPassword).toHaveBeenCalledWith('password123');
    });

    it('should fail login with incorrect password', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'wrongpassword'
      };

      const mockUser = {
        _id: 'user-123',
        email: 'user@example.com',
        isActive: true,
        matchPassword: jest.fn().mockResolvedValue(false)
      };

      User.findOne.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail login for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      User.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should fail login for inactive user', async () => {
      const loginData = {
        email: 'user@example.com',
        password: 'password123'
      };

      const mockUser = {
        _id: 'user-123',
        email: 'user@example.com',
        isActive: false,
        matchPassword: jest.fn().mockResolvedValue(true)
      };

      User.findOne.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('deactivated');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const refreshData = {
        refreshToken: 'valid-refresh-token'
      };

      const mockUser = {
        _id: 'user-123',
        refreshToken: 'valid-refresh-token'
      };

      User.findById.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should fail if refresh token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid refresh token', async () => {
      const refreshData = {
        refreshToken: 'invalid-token'
      };

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      protect.mockImplementation((req, res, next) => {
        req.user = {
          _id: 'user-123',
          refreshToken: 'token',
          save: jest.fn().mockResolvedValue(null)
        };
        next();
      });

      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get current user successfully', async () => {
      protect.mockImplementation((req, res, next) => {
        req.user = {
          _id: 'user-123',
          email: 'user@example.com',
          firstName: 'John'
        };
        next();
      });

      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('_id');
    });
  });
});
