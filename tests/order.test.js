import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import {
  validOrderData,
  createTestUser,
  createTestAdmin,
  createTestProduct,
  createTestCategory,
  createTestOrder,
  getAuthToken
} from './fixtures.js';

describe('Order API Tests', () => {
  let userToken;
  let adminToken;
  let user;
  let adminUser;
  let product;
  let category;

  beforeEach(async () => {
    // Create users
    user = await createTestUser();
    adminUser = await createTestAdmin();

    userToken = getAuthToken(user);
    adminToken = getAuthToken(adminUser);

    // Create test product
    category = await createTestCategory();
    product = await createTestProduct({
      name: 'Test Product',
      price: 99.99,
      stock: 10,
      sku: 'TEST-001',
      category: category._id
    }, category);
  });

  describe('POST /api/orders', () => {
    it('should create order with valid data', async () => {
      const orderData = {
        items: [
          {
            product: product._id,
            quantity: 2,
            price: product.price
          }
        ],
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
        paymentMethod: 'card'
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order).toHaveProperty('_id');
      expect(response.body.data.order.items).toHaveLength(1);
      expect(response.body.data.order.orderStatus).toBe('pending');
    });

    it('should not create order without authentication', async () => {
      const orderData = {
        items: [
          {
            product: product._id,
            quantity: 1,
            price: product.price
          }
        ],
        shippingAddress: validOrderData.shippingAddress,
        paymentMethod: 'card'
      };

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not create order with empty items', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [],
          shippingAddress: validOrderData.shippingAddress,
          paymentMethod: 'card'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('items');
    });

    it('should not create order with invalid product', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [
            {
              product: fakeId,
              quantity: 1,
              price: 99.99
            }
          ],
          shippingAddress: validOrderData.shippingAddress,
          paymentMethod: 'card'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not create order with insufficient stock', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [
            {
              product: product._id,
              quantity: 100, // More than available stock
              price: product.price
            }
          ],
          shippingAddress: validOrderData.shippingAddress,
          paymentMethod: 'card'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('stock');
    });

    it('should not create order with invalid shipping address', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [
            {
              product: product._id,
              quantity: 1,
              price: product.price
            }
          ],
          shippingAddress: {
            // Missing required fields
            firstName: 'John'
          },
          paymentMethod: 'card'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should calculate order totals correctly', async () => {
      const quantity = 2;
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [
            {
              product: product._id,
              quantity: quantity,
              price: product.price
            }
          ],
          shippingAddress: validOrderData.shippingAddress,
          paymentMethod: 'card'
        })
        .expect(201);

      const subtotal = product.price * quantity;
      expect(response.body.data.order.subtotal).toBe(subtotal);
      expect(response.body.data.order.total).toBeGreaterThan(subtotal); // Should include tax and shipping
    });

    it('should reduce product stock after order creation', async () => {
      const initialStock = product.stock;
      const quantity = 2;

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          items: [
            {
              product: product._id,
              quantity: quantity,
              price: product.price
            }
          ],
          shippingAddress: validOrderData.shippingAddress,
          paymentMethod: 'card'
        })
        .expect(201);

      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(initialStock - quantity);
    });
  });

  describe('GET /api/orders', () => {
    it('should get user orders', async () => {
      await createTestOrder(user, [product]);

      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toBeInstanceOf(Array);
      expect(response.body.data.orders.length).toBeGreaterThan(0);
    });

    it('should not get orders without authentication', async () => {
      const response = await request(app)
        .get('/api/orders')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should filter orders by status', async () => {
      const order1 = await createTestOrder(user, [product]);
      order1.orderStatus = 'processing';
      await order1.save();

      const order2 = await createTestOrder(user, [product]);
      order2.orderStatus = 'delivered';
      await order2.save();

      const response = await request(app)
        .get('/api/orders?status=processing')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(1);
      expect(response.body.data.orders[0].orderStatus).toBe('processing');
    });

    it('should paginate orders', async () => {
      // Create multiple orders
      for (let i = 0; i < 5; i++) {
        await createTestOrder(user, [product]);
      }

      const response = await request(app)
        .get('/api/orders?page=1&limit=3')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders.length).toBe(3);
      expect(response.body.data.pagination).toHaveProperty('currentPage', 1);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should get order by ID', async () => {
      const order = await createTestOrder(user, [product]);

      const response = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order._id.toString()).toBe(order._id.toString());
    });

    it('should not get other user\'s order', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        password: 'Test@1234',
        firstName: 'Other',
        lastName: 'User'
      });

      const order = await createTestOrder(otherUser, [product]);

      const response = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent order', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/orders/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should allow admin to view any order', async () => {
      const order = await createTestOrder(user, [product]);

      const response = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order._id.toString()).toBe(order._id.toString());
    });
  });

  describe('PUT /api/orders/:id/status (Admin)', () => {
    it('should update order status', async () => {
      const order = await createTestOrder(user, [product]);

      const response = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'processing'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.orderStatus).toBe('processing');
    });

    it('should not update status without admin privileges', async () => {
      const order = await createTestOrder(user, [product]);

      const response = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          status: 'processing'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should not update to invalid status', async () => {
      const order = await createTestOrder(user, [product]);

      const response = await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'invalid-status'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should add status to order timeline', async () => {
      const order = await createTestOrder(user, [product]);

      await request(app)
        .put(`/api/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'processing',
          note: 'Order is being processed'
        })
        .expect(200);

      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.timeline).toHaveLength(2); // Initial + new status
      expect(updatedOrder.timeline[1].status).toBe('processing');
    });
  });

  describe('POST /api/orders/:id/cancel', () => {
    it('should cancel order by user', async () => {
      const order = await createTestOrder(user, [product]);

      const response = await request(app)
        .post(`/api/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'Changed my mind'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.orderStatus).toBe('cancelled');
    });

    it('should not cancel already shipped order', async () => {
      const order = await createTestOrder(user, [product]);
      order.orderStatus = 'shipped';
      await order.save();

      const response = await request(app)
        .post(`/api/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'Changed my mind'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('cannot be cancelled');
    });

    it('should restore product stock after cancellation', async () => {
      const initialStock = product.stock;
      const order = await createTestOrder(user, [product]);
      const orderedQuantity = order.items[0].quantity;

      await request(app)
        .post(`/api/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'Changed my mind'
        })
        .expect(200);

      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(initialStock);
    });
  });

  describe('GET /api/admin/orders (Admin)', () => {
    it('should get all orders for admin', async () => {
      await createTestOrder(user, [product]);
      await createTestOrder(user, [product]);

      const response = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toBeInstanceOf(Array);
      expect(response.body.data.orders.length).toBeGreaterThan(0);
    });

    it('should not allow non-admin to access', async () => {
      const response = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should filter orders by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await createTestOrder(user, [product]);

      const response = await request(app)
        .get(`/api/admin/orders?startDate=${yesterday.toISOString()}&endDate=${tomorrow.toISOString()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders.length).toBeGreaterThan(0);
    });

    it('should search orders by order number', async () => {
      const order = await createTestOrder(user, [product]);

      const response = await request(app)
        .get(`/api/admin/orders?search=${order.orderNumber}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders.length).toBe(1);
      expect(response.body.data.orders[0]._id.toString()).toBe(order._id.toString());
    });
  });

  describe('GET /api/orders/:id/tracking', () => {
    it('should get order tracking information', async () => {
      const order = await createTestOrder(user, [product]);
      order.trackingNumber = 'TRACK123456';
      order.shippingProvider = 'FedEx';
      await order.save();

      const response = await request(app)
        .get(`/api/orders/${order._id}/tracking`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tracking).toHaveProperty('trackingNumber', 'TRACK123456');
      expect(response.body.data.tracking).toHaveProperty('shippingProvider', 'FedEx');
    });

    it('should return message if tracking not available', async () => {
      const order = await createTestOrder(user, [product]);

      const response = await request(app)
        .get(`/api/orders/${order._id}/tracking`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('not available');
    });
  });

  describe('POST /api/orders/:id/refund (Admin)', () => {
    it('should process refund for order', async () => {
      const order = await createTestOrder(user, [product]);
      order.paymentStatus = 'paid';
      await order.save();

      const response = await request(app)
        .post(`/api/orders/${order._id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Customer request',
          amount: order.total
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.paymentStatus).toBe('refunded');
    });

    it('should not refund unpaid order', async () => {
      const order = await createTestOrder(user, [product]);

      const response = await request(app)
        .post(`/api/orders/${order._id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Customer request',
          amount: order.total
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should not allow partial refund greater than order total', async () => {
      const order = await createTestOrder(user, [product]);
      order.paymentStatus = 'paid';
      await order.save();

      const response = await request(app)
        .post(`/api/orders/${order._id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Partial refund',
          amount: order.total + 100
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
