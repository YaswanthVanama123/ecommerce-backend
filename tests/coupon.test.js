import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import Coupon from '../models/Coupon.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import {
  validCouponData,
  fixedCouponData,
  expiredCouponData,
  createTestCoupon,
  createTestAdmin,
  createTestUser,
  createTestCategory,
  createTestProduct,
  getAuthToken
} from './fixtures.js';

describe('Coupon API Tests', () => {
  let adminToken;
  let userToken;
  let adminUser;
  let user;
  let category;
  let product;

  beforeEach(async () => {
    // Create users
    adminUser = await createTestAdmin();
    user = await createTestUser();

    adminToken = getAuthToken(adminUser);
    userToken = getAuthToken(user);

    // Create test category and product
    category = await createTestCategory();
    product = await createTestProduct({
      name: 'Test Product',
      price: 200.00,
      stock: 10,
      sku: 'TEST-001'
    }, category);
  });

  describe('GET /api/coupons (Admin)', () => {
    it('should get all coupons', async () => {
      await createTestCoupon(validCouponData);
      await createTestCoupon(fixedCouponData);

      const response = await request(app)
        .get('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.coupons).toBeInstanceOf(Array);
      expect(response.body.data.coupons.length).toBeGreaterThanOrEqual(2);
    });

    it('should not allow non-admin to access', async () => {
      const response = await request(app)
        .get('/api/coupons')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should filter coupons by status', async () => {
      await createTestCoupon(validCouponData);
      await createTestCoupon(expiredCouponData);

      const response = await request(app)
        .get('/api/coupons?status=active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.coupons.forEach(coupon => {
        expect(coupon.isActive).toBe(true);
        expect(new Date(coupon.validTo)).toBeInstanceOf(Date);
      });
    });

    it('should filter coupons by type', async () => {
      await createTestCoupon(validCouponData); // percentage
      await createTestCoupon(fixedCouponData); // fixed

      const response = await request(app)
        .get('/api/coupons?type=percentage')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.coupons.forEach(coupon => {
        expect(coupon.type).toBe('percentage');
      });
    });

    it('should search coupons by code', async () => {
      await createTestCoupon(validCouponData);

      const response = await request(app)
        .get(`/api/coupons?search=${validCouponData.code}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.coupons.length).toBe(1);
      expect(response.body.data.coupons[0].code).toBe(validCouponData.code);
    });
  });

  describe('POST /api/coupons (Admin)', () => {
    it('should create coupon with valid data', async () => {
      const response = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validCouponData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.coupon).toHaveProperty('code', validCouponData.code);
      expect(response.body.data.coupon).toHaveProperty('type', validCouponData.type);
      expect(response.body.data.coupon).toHaveProperty('value', validCouponData.value);
    });

    it('should not create coupon without admin privileges', async () => {
      const response = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validCouponData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should not create coupon with duplicate code', async () => {
      await createTestCoupon(validCouponData);

      const response = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validCouponData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should not create coupon with invalid type', async () => {
      const response = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validCouponData,
          type: 'invalid-type'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not create coupon with negative value', async () => {
      const response = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validCouponData,
          value: -10
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not create percentage coupon with value > 100', async () => {
      const response = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validCouponData,
          type: 'percentage',
          value: 150
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should create coupon with applicable categories', async () => {
      const response = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validCouponData,
          code: 'CATEGORY20',
          applicableCategories: [category._id]
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.coupon.applicableCategories).toHaveLength(1);
    });

    it('should create coupon with applicable products', async () => {
      const response = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validCouponData,
          code: 'PRODUCT20',
          applicableProducts: [product._id]
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.coupon.applicableProducts).toHaveLength(1);
    });
  });

  describe('POST /api/coupons/validate', () => {
    it('should validate active coupon', async () => {
      const coupon = await createTestCoupon(validCouponData);

      const response = await request(app)
        .post('/api/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: coupon.code,
          orderTotal: 150.00
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.discount).toBeDefined();
    });

    it('should not validate expired coupon', async () => {
      const coupon = await createTestCoupon(expiredCouponData);

      const response = await request(app)
        .post('/api/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: coupon.code,
          orderTotal: 150.00
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('expired');
    });

    it('should not validate inactive coupon', async () => {
      const coupon = await createTestCoupon({
        ...validCouponData,
        code: 'INACTIVE',
        isActive: false
      });

      const response = await request(app)
        .post('/api/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: coupon.code,
          orderTotal: 150.00
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not active');
    });

    it('should not validate if order total below minimum', async () => {
      const coupon = await createTestCoupon(validCouponData); // minOrderValue: 100

      const response = await request(app)
        .post('/api/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: coupon.code,
          orderTotal: 50.00 // Below minimum
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('minimum');
    });

    it('should calculate percentage discount correctly', async () => {
      const coupon = await createTestCoupon(validCouponData); // 20% off

      const response = await request(app)
        .post('/api/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: coupon.code,
          orderTotal: 200.00
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.discount).toBe(40.00); // 20% of 200
    });

    it('should apply max discount cap for percentage coupons', async () => {
      const coupon = await createTestCoupon(validCouponData); // 20% off, maxDiscount: 50

      const response = await request(app)
        .post('/api/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: coupon.code,
          orderTotal: 500.00 // 20% would be 100, but capped at 50
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.discount).toBe(50.00);
    });

    it('should calculate fixed discount correctly', async () => {
      const coupon = await createTestCoupon(fixedCouponData); // $50 off

      const response = await request(app)
        .post('/api/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: coupon.code,
          orderTotal: 300.00
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.discount).toBe(50.00);
    });

    it('should not validate coupon at usage limit', async () => {
      const coupon = await createTestCoupon({
        ...validCouponData,
        code: 'LIMIT1',
        usageLimit: 1,
        usedCount: 1
      });

      const response = await request(app)
        .post('/api/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: coupon.code,
          orderTotal: 150.00
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('limit');
    });

    it('should validate coupon for applicable categories', async () => {
      const coupon = await Coupon.create({
        ...validCouponData,
        code: 'CAT20',
        applicableCategories: [category._id]
      });

      const response = await request(app)
        .post('/api/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: coupon.code,
          orderTotal: 150.00,
          items: [
            {
              product: product._id,
              category: category._id
            }
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should not validate coupon for non-applicable categories', async () => {
      const anotherCategory = await Category.create({
        name: 'Other',
        slug: 'other',
        isActive: true
      });

      const coupon = await Coupon.create({
        ...validCouponData,
        code: 'CAT20',
        applicableCategories: [anotherCategory._id]
      });

      const response = await request(app)
        .post('/api/coupons/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: coupon.code,
          orderTotal: 150.00,
          items: [
            {
              product: product._id,
              category: category._id
            }
          ]
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/coupons/apply', () => {
    it('should apply coupon and increment usage count', async () => {
      const coupon = await createTestCoupon(validCouponData);
      const initialUsedCount = coupon.usedCount;

      const response = await request(app)
        .post('/api/coupons/apply')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: coupon.code,
          orderTotal: 150.00
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify usage count incremented
      const updatedCoupon = await Coupon.findById(coupon._id);
      expect(updatedCoupon.usedCount).toBe(initialUsedCount + 1);
    });
  });

  describe('PUT /api/coupons/:id (Admin)', () => {
    it('should update coupon', async () => {
      const coupon = await createTestCoupon(validCouponData);

      const response = await request(app)
        .put(`/api/coupons/${coupon._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          value: 25,
          description: 'Updated description'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.coupon.value).toBe(25);
      expect(response.body.data.coupon.description).toBe('Updated description');
    });

    it('should not update coupon without admin privileges', async () => {
      const coupon = await createTestCoupon(validCouponData);

      const response = await request(app)
        .put(`/api/coupons/${coupon._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          value: 25
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should not update coupon code to existing code', async () => {
      const coupon1 = await createTestCoupon(validCouponData);
      const coupon2 = await createTestCoupon(fixedCouponData);

      const response = await request(app)
        .put(`/api/coupons/${coupon2._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: coupon1.code
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/coupons/:id (Admin)', () => {
    it('should delete coupon', async () => {
      const coupon = await createTestCoupon(validCouponData);

      const response = await request(app)
        .delete(`/api/coupons/${coupon._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify coupon is deleted
      const deletedCoupon = await Coupon.findById(coupon._id);
      expect(deletedCoupon).toBeNull();
    });

    it('should not delete coupon without admin privileges', async () => {
      const coupon = await createTestCoupon(validCouponData);

      const response = await request(app)
        .delete(`/api/coupons/${coupon._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent coupon', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/coupons/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/coupons/:id (Admin)', () => {
    it('should get coupon by ID', async () => {
      const coupon = await createTestCoupon(validCouponData);

      const response = await request(app)
        .get(`/api/coupons/${coupon._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.coupon._id.toString()).toBe(coupon._id.toString());
    });

    it('should return 404 for non-existent coupon', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/coupons/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/coupons/:id/deactivate (Admin)', () => {
    it('should deactivate coupon', async () => {
      const coupon = await createTestCoupon(validCouponData);

      const response = await request(app)
        .post(`/api/coupons/${coupon._id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify coupon is deactivated
      const updatedCoupon = await Coupon.findById(coupon._id);
      expect(updatedCoupon.isActive).toBe(false);
    });
  });

  describe('POST /api/coupons/:id/activate (Admin)', () => {
    it('should activate deactivated coupon', async () => {
      const coupon = await createTestCoupon({
        ...validCouponData,
        code: 'INACTIVE',
        isActive: false
      });

      const response = await request(app)
        .post(`/api/coupons/${coupon._id}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify coupon is activated
      const updatedCoupon = await Coupon.findById(coupon._id);
      expect(updatedCoupon.isActive).toBe(true);
    });
  });
});
