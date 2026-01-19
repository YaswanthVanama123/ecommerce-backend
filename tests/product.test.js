import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import {
  validProductData,
  anotherProductData,
  outOfStockProductData,
  validCategoryData,
  createTestProduct,
  createTestCategory,
  createTestAdmin,
  createMultipleProducts,
  getAuthToken
} from './fixtures.js';

describe('Product API Tests', () => {
  let adminToken;
  let adminUser;
  let category;

  beforeEach(async () => {
    // Create admin user and get token
    adminUser = await createTestAdmin();
    adminToken = getAuthToken(adminUser);

    // Create test category
    category = await createTestCategory();
  });

  describe('GET /api/products', () => {
    it('should get all active products', async () => {
      await createTestProduct(validProductData, category);
      await createTestProduct(anotherProductData, category);

      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toBeInstanceOf(Array);
      expect(response.body.data.products.length).toBeGreaterThan(0);
    });

    it('should filter products by category', async () => {
      const anotherCategory = await Category.create({
        name: 'Books',
        slug: 'books',
        isActive: true
      });

      await createTestProduct(validProductData, category);
      await createTestProduct(anotherProductData, anotherCategory);

      const response = await request(app)
        .get(`/api/products?category=${category._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBe(1);
      expect(response.body.data.products[0].category._id.toString()).toBe(category._id.toString());
    });

    it('should search products by name', async () => {
      await createTestProduct(validProductData, category);
      await createTestProduct(anotherProductData, category);

      const response = await request(app)
        .get('/api/products?search=Headphones')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBe(1);
      expect(response.body.data.products[0].name).toContain('Headphones');
    });

    it('should filter products by price range', async () => {
      await createTestProduct(validProductData, category); // $199.99
      await createTestProduct(anotherProductData, category); // $299.99

      const response = await request(app)
        .get('/api/products?minPrice=250&maxPrice=350')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBe(1);
      expect(response.body.data.products[0].price).toBe(299.99);
    });

    it('should sort products by price ascending', async () => {
      await createTestProduct(anotherProductData, category); // $299.99
      await createTestProduct(validProductData, category); // $199.99

      const response = await request(app)
        .get('/api/products?sort=price')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products[0].price).toBeLessThan(
        response.body.data.products[1].price
      );
    });

    it('should sort products by price descending', async () => {
      await createTestProduct(validProductData, category); // $199.99
      await createTestProduct(anotherProductData, category); // $299.99

      const response = await request(app)
        .get('/api/products?sort=-price')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products[0].price).toBeGreaterThan(
        response.body.data.products[1].price
      );
    });

    it('should paginate products', async () => {
      await createMultipleProducts(10, category);

      const response = await request(app)
        .get('/api/products?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBe(5);
      expect(response.body.data.pagination).toHaveProperty('currentPage', 1);
      expect(response.body.data.pagination).toHaveProperty('totalPages', 2);
    });

    it('should get featured products only', async () => {
      await createTestProduct(validProductData, category); // isFeatured: true
      await createTestProduct(anotherProductData, category); // isFeatured: false

      const response = await request(app)
        .get('/api/products?featured=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBe(1);
      expect(response.body.data.products[0].isFeatured).toBe(true);
    });

    it('should not return inactive products', async () => {
      await createTestProduct({
        ...validProductData,
        isActive: false
      }, category);

      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products.length).toBe(0);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should get product by ID', async () => {
      const product = await createTestProduct(validProductData, category);

      const response = await request(app)
        .get(`/api/products/${product._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product).toHaveProperty('name', validProductData.name);
      expect(response.body.data.product).toHaveProperty('price', validProductData.price);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/products/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for invalid product ID', async () => {
      const response = await request(app)
        .get('/api/products/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/products (Admin)', () => {
    it('should create product with valid data', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validProductData,
          category: category._id
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product).toHaveProperty('name', validProductData.name);
      expect(response.body.data.product).toHaveProperty('sku', validProductData.sku);
    });

    it('should not create product without authentication', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({
          ...validProductData,
          category: category._id
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not create product with duplicate SKU', async () => {
      await createTestProduct(validProductData, category);

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validProductData,
          category: category._id
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('SKU');
    });

    it('should not create product with missing required fields', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Product'
          // Missing other required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not create product with invalid price', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validProductData,
          price: -10,
          category: category._id
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not create product with invalid category', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validProductData,
          category: fakeId
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/products/:id (Admin)', () => {
    it('should update product with valid data', async () => {
      const product = await createTestProduct(validProductData, category);

      const response = await request(app)
        .put(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Headphones',
          price: 249.99
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.name).toBe('Updated Headphones');
      expect(response.body.data.product.price).toBe(249.99);
    });

    it('should not update product without authentication', async () => {
      const product = await createTestProduct(validProductData, category);

      const response = await request(app)
        .put(`/api/products/${product._id}`)
        .send({
          name: 'Updated Headphones'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should update product stock', async () => {
      const product = await createTestProduct(validProductData, category);

      const response = await request(app)
        .put(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stock: 100
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.stock).toBe(100);
    });

    it('should not update product with invalid data', async () => {
      const product = await createTestProduct(validProductData, category);

      const response = await request(app)
        .put(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 'invalid-price'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/api/products/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/products/:id (Admin)', () => {
    it('should soft delete product', async () => {
      const product = await createTestProduct(validProductData, category);

      const response = await request(app)
        .delete(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify product is soft deleted (isActive = false)
      const deletedProduct = await Product.findById(product._id);
      expect(deletedProduct.isActive).toBe(false);
    });

    it('should not delete product without authentication', async () => {
      const product = await createTestProduct(validProductData, category);

      const response = await request(app)
        .delete(`/api/products/${product._id}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/products/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/products/:id/reviews', () => {
    it('should add review to product', async () => {
      const product = await createTestProduct(validProductData, category);
      const user = await User.create({
        email: 'user@example.com',
        password: 'Test@1234',
        firstName: 'Test',
        lastName: 'User'
      });
      const userToken = getAuthToken(user);

      const response = await request(app)
        .post(`/api/products/${product._id}/reviews`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          rating: 5,
          comment: 'Excellent product!'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.review).toHaveProperty('rating', 5);
    });

    it('should not add review without authentication', async () => {
      const product = await createTestProduct(validProductData, category);

      const response = await request(app)
        .post(`/api/products/${product._id}/reviews`)
        .send({
          rating: 5,
          comment: 'Great product!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not add review with invalid rating', async () => {
      const product = await createTestProduct(validProductData, category);
      const user = await User.create({
        email: 'user@example.com',
        password: 'Test@1234',
        firstName: 'Test',
        lastName: 'User'
      });
      const userToken = getAuthToken(user);

      const response = await request(app)
        .post(`/api/products/${product._id}/reviews`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          rating: 6, // Invalid rating (should be 1-5)
          comment: 'Test'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/products/:id/stock', () => {
    it('should get product stock availability', async () => {
      const product = await createTestProduct(validProductData, category);

      const response = await request(app)
        .get(`/api/products/${product._id}/stock`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('inStock', true);
      expect(response.body.data).toHaveProperty('quantity', validProductData.stock);
    });

    it('should show out of stock for product with zero stock', async () => {
      const product = await createTestProduct(outOfStockProductData, category);

      const response = await request(app)
        .get(`/api/products/${product._id}/stock`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('inStock', false);
      expect(response.body.data).toHaveProperty('quantity', 0);
    });
  });

  describe('GET /api/products/:id/related', () => {
    it('should get related products from same category', async () => {
      const product = await createTestProduct(validProductData, category);
      await createTestProduct(anotherProductData, category);

      const response = await request(app)
        .get(`/api/products/${product._id}/related`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toBeInstanceOf(Array);
      expect(response.body.data.products.length).toBeGreaterThan(0);
    });

    it('should not include the product itself in related products', async () => {
      const product = await createTestProduct(validProductData, category);
      await createTestProduct(anotherProductData, category);

      const response = await request(app)
        .get(`/api/products/${product._id}/related`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const relatedIds = response.body.data.products.map(p => p._id.toString());
      expect(relatedIds).not.toContain(product._id.toString());
    });
  });
});
