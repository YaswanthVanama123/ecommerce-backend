import request from 'supertest';
import express from 'express';
import productRoutes from '../routes/productRoutes.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import Product from '../models/Product.js';

// Mock models and middleware
jest.mock('../models/Product.js');
jest.mock('../utils/apiResponse.js');
jest.mock('../middleware/auth.js');
jest.mock('../middleware/roleCheck.js');
jest.mock('../middleware/upload.js', () => ({
  array: jest.fn().mockReturnValue((req, res, next) => next())
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api/products', productRoutes);

describe('Product Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendSuccess.mockImplementation((res, status, data, message) => {
      res.status(status).json({ success: true, data, message });
    });
    sendError.mockImplementation((res, status, message) => {
      res.status(status).json({ success: false, message });
    });

    // Mock auth middleware for protected routes
    protect.mockImplementation((req, res, next) => {
      req.user = {
        _id: 'user-123',
        role: 'admin'
      };
      next();
    });

    isAdmin.mockImplementation((req, res, next) => {
      if (req.user && req.user.role === 'admin') {
        next();
      } else {
        res.status(403).json({ success: false, message: 'Not authorized' });
      }
    });
  });

  describe('GET /api/products', () => {
    it('should get all products with default pagination', async () => {
      const mockProducts = [
        {
          _id: 'product-1',
          name: 'Product 1',
          price: 99.99,
          isActive: true
        },
        {
          _id: 'product-2',
          name: 'Product 2',
          price: 149.99,
          isActive: true
        }
      ];

      Product.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue(mockProducts)
              })
            })
          })
        })
      });

      Product.countDocuments.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/products');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('products');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.products.length).toBe(2);
    });

    it('should filter products by category', async () => {
      const mockProducts = [
        {
          _id: 'product-1',
          name: 'Electronics Product',
          category: 'electronics',
          price: 299.99
        }
      ];

      Product.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue(mockProducts)
              })
            })
          })
        })
      });

      Product.countDocuments.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/products?category=electronics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
    });

    it('should filter products by price range', async () => {
      Product.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue([])
              })
            })
          })
        })
      });

      Product.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/products?minPrice=50&maxPrice=150');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should sort products by price ascending', async () => {
      Product.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue([])
              })
            })
          })
        })
      });

      Product.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/products?sort=price-low');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle pagination', async () => {
      Product.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue([])
              })
            })
          })
        })
      });

      Product.countDocuments.mockResolvedValue(50);

      const response = await request(app)
        .get('/api/products?page=2&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.page).toBe(2);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination.total).toBe(50);
    });
  });

  describe('GET /api/products/featured', () => {
    it('should get featured products', async () => {
      const mockFeaturedProducts = [
        {
          _id: 'featured-1',
          name: 'Featured Product 1',
          isFeatured: true,
          price: 199.99
        }
      ];

      Product.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue(mockFeaturedProducts)
            })
          })
        })
      });

      const response = await request(app)
        .get('/api/products/featured');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should limit featured products', async () => {
      Product.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue([])
            })
          })
        })
      });

      const response = await request(app)
        .get('/api/products/featured?limit=5');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should get product by ID', async () => {
      const mockProduct = {
        _id: 'product-1',
        name: 'Product 1',
        price: 99.99,
        description: 'A great product',
        reviews: []
      };

      Product.findById.mockReturnValue({
        populate: jest.fn()
          .mockReturnValueOnce({
            populate: jest.fn().mockResolvedValue(mockProduct)
          })
      });

      const response = await request(app)
        .get('/api/products/product-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe('product-1');
    });

    it('should return 404 if product not found', async () => {
      Product.findById.mockReturnValue({
        populate: jest.fn()
          .mockReturnValueOnce({
            populate: jest.fn().mockResolvedValue(null)
          })
      });

      const response = await request(app)
        .get('/api/products/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/products', () => {
    it('should create a new product (admin only)', async () => {
      const productData = {
        name: 'New Product',
        price: 79.99,
        description: 'A new product',
        category: 'category-1',
        stock: 50
      };

      const mockCreatedProduct = {
        _id: 'product-new',
        ...productData,
        createdBy: 'user-123'
      };

      Product.create.mockResolvedValue(mockCreatedProduct);

      const response = await request(app)
        .post('/api/products')
        .send(productData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe('product-new');
    });

    it('should handle product creation errors', async () => {
      const productData = {
        name: 'New Product',
        price: 79.99
      };

      Product.create.mockRejectedValue(new Error('Validation error'));

      const response = await request(app)
        .post('/api/products')
        .send(productData);

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update a product (admin only)', async () => {
      const updateData = {
        name: 'Updated Product',
        price: 89.99
      };

      const mockProduct = {
        _id: 'product-1',
        name: 'Old Product',
        price: 79.99,
        save: jest.fn().mockResolvedValue({
          _id: 'product-1',
          ...updateData
        })
      };

      Product.findById.mockResolvedValue(mockProduct);

      const response = await request(app)
        .put('/api/products/product-1')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 if product to update not found', async () => {
      Product.findById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/products/nonexistent-id')
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete a product (admin only)', async () => {
      const mockProduct = {
        _id: 'product-1',
        deleteOne: jest.fn().mockResolvedValue(null)
      };

      Product.findById.mockResolvedValue(mockProduct);

      const response = await request(app)
        .delete('/api/products/product-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockProduct.deleteOne).toHaveBeenCalled();
    });

    it('should return 404 if product to delete not found', async () => {
      Product.findById.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/products/nonexistent-id');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/products/:id/reviews', () => {
    it('should add a review to a product', async () => {
      const reviewData = {
        rating: 5,
        comment: 'Great product!'
      };

      const mockProduct = {
        _id: 'product-1',
        reviews: [],
        updateRatings: jest.fn(),
        save: jest.fn().mockResolvedValue({
          _id: 'product-1',
          reviews: [{ ...reviewData, user: 'user-123' }]
        })
      };

      Product.findById.mockResolvedValue(mockProduct);

      const response = await request(app)
        .post('/api/products/product-1/reviews')
        .send(reviewData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(mockProduct.updateRatings).toHaveBeenCalled();
    });

    it('should not allow duplicate reviews from same user', async () => {
      const reviewData = {
        rating: 5,
        comment: 'Great product!'
      };

      const mockProduct = {
        _id: 'product-1',
        reviews: [{
          user: 'user-123',
          rating: 4,
          comment: 'Good'
        }],
        findById: jest.fn()
      };

      Product.findById.mockResolvedValue(mockProduct);

      const response = await request(app)
        .post('/api/products/product-1/reviews')
        .send(reviewData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 if product for review not found', async () => {
      Product.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/products/nonexistent-id/reviews')
        .send({ rating: 5, comment: 'Great!' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
