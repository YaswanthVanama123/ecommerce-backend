import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import {
  validPaymentData,
  createTestUser,
  createTestAdmin,
  createTestOrder,
  createTestProduct,
  createTestCategory,
  getAuthToken
} from './fixtures.js';

describe('Payment API Tests', () => {
  let userToken;
  let adminToken;
  let user;
  let adminUser;
  let order;
  let product;

  beforeEach(async () => {
    // Create users
    user = await createTestUser();
    adminUser = await createTestAdmin();

    userToken = getAuthToken(user);
    adminToken = getAuthToken(adminUser);

    // Create test order
    const category = await createTestCategory();
    product = await createTestProduct({
      name: 'Test Product',
      price: 99.99,
      stock: 10,
      sku: 'TEST-001'
    }, category);

    order = await createTestOrder(user, [product]);
  });

  describe('POST /api/payments/create-payment-intent', () => {
    it('should create payment intent for order', async () => {
      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: order._id,
          paymentMethod: 'card'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('clientSecret');
      expect(response.body.data).toHaveProperty('paymentIntentId');
    });

    it('should not create payment intent without authentication', async () => {
      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .send({
          orderId: order._id,
          paymentMethod: 'card'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not create payment intent for non-existent order', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: fakeId,
          paymentMethod: 'card'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should not create payment intent for other user\'s order', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Test@1234',
        firstName: 'Other',
        lastName: 'User'
      });

      const otherOrder = await createTestOrder(otherUser, [product]);

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: otherOrder._id,
          paymentMethod: 'card'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should not create payment intent for already paid order', async () => {
      order.paymentStatus = 'paid';
      await order.save();

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: order._id,
          paymentMethod: 'card'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already paid');
    });
  });

  describe('POST /api/payments/confirm-payment', () => {
    it('should confirm payment and update order status', async () => {
      const response = await request(app)
        .post('/api/payments/confirm-payment')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: order._id,
          paymentIntentId: 'pi_test_123456',
          paymentMethod: 'card'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payment).toHaveProperty('status', 'completed');

      // Verify order is updated
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.paymentStatus).toBe('paid');
    });

    it('should not confirm payment without authentication', async () => {
      const response = await request(app)
        .post('/api/payments/confirm-payment')
        .send({
          orderId: order._id,
          paymentIntentId: 'pi_test_123456',
          paymentMethod: 'card'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should create payment record after confirmation', async () => {
      await request(app)
        .post('/api/payments/confirm-payment')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: order._id,
          paymentIntentId: 'pi_test_123456',
          paymentMethod: 'card'
        })
        .expect(200);

      const payment = await Payment.findOne({ order: order._id });
      expect(payment).toBeDefined();
      expect(payment.user.toString()).toBe(user._id.toString());
      expect(payment.status).toBe('completed');
    });
  });

  describe('POST /api/payments/cash-on-delivery', () => {
    it('should create COD order', async () => {
      const response = await request(app)
        .post('/api/payments/cash-on-delivery')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: order._id
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payment).toHaveProperty('paymentMethod', 'cod');
      expect(response.body.data.payment).toHaveProperty('status', 'pending');

      // Verify order payment method is updated
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.paymentMethod).toBe('cod');
    });

    it('should not create COD for already paid order', async () => {
      order.paymentStatus = 'paid';
      await order.save();

      const response = await request(app)
        .post('/api/payments/cash-on-delivery')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: order._id
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/payments/order/:orderId', () => {
    it('should get payment details for order', async () => {
      // Create a payment
      const payment = await Payment.create({
        order: order._id,
        user: user._id,
        amount: order.total,
        currency: 'USD',
        paymentMethod: 'card',
        status: 'completed',
        transactionId: 'txn_test_123'
      });

      const response = await request(app)
        .get(`/api/payments/order/${order._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payment).toHaveProperty('_id', payment._id.toString());
      expect(response.body.data.payment).toHaveProperty('status', 'completed');
    });

    it('should not get payment details for other user\'s order', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        password: 'Test@1234',
        firstName: 'Other',
        lastName: 'User'
      });

      const otherOrder = await createTestOrder(otherUser, [product]);

      const response = await request(app)
        .get(`/api/payments/order/${otherOrder._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 if no payment found', async () => {
      const response = await request(app)
        .get(`/api/payments/order/${order._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('GET /api/payments/user-payments', () => {
    it('should get all user payments', async () => {
      // Create multiple payments
      await Payment.create({
        order: order._id,
        user: user._id,
        amount: 99.99,
        currency: 'USD',
        paymentMethod: 'card',
        status: 'completed'
      });

      const anotherOrder = await createTestOrder(user, [product]);
      await Payment.create({
        order: anotherOrder._id,
        user: user._id,
        amount: 149.99,
        currency: 'USD',
        paymentMethod: 'card',
        status: 'completed'
      });

      const response = await request(app)
        .get('/api/payments/user-payments')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toBeInstanceOf(Array);
      expect(response.body.data.payments.length).toBe(2);
    });

    it('should not get payments without authentication', async () => {
      const response = await request(app)
        .get('/api/payments/user-payments')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should filter payments by status', async () => {
      await Payment.create({
        order: order._id,
        user: user._id,
        amount: 99.99,
        currency: 'USD',
        paymentMethod: 'card',
        status: 'completed'
      });

      const anotherOrder = await createTestOrder(user, [product]);
      await Payment.create({
        order: anotherOrder._id,
        user: user._id,
        amount: 149.99,
        currency: 'USD',
        paymentMethod: 'card',
        status: 'pending'
      });

      const response = await request(app)
        .get('/api/payments/user-payments?status=completed')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toHaveLength(1);
      expect(response.body.data.payments[0].status).toBe('completed');
    });
  });

  describe('POST /api/payments/refund (Admin)', () => {
    it('should process refund for payment', async () => {
      const payment = await Payment.create({
        order: order._id,
        user: user._id,
        amount: order.total,
        currency: 'USD',
        paymentMethod: 'card',
        status: 'completed',
        transactionId: 'txn_test_123'
      });

      order.paymentStatus = 'paid';
      await order.save();

      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          paymentId: payment._id,
          reason: 'Customer request',
          amount: payment.amount
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.refund).toHaveProperty('status', 'completed');

      // Verify payment is updated
      const updatedPayment = await Payment.findById(payment._id);
      expect(updatedPayment.status).toBe('refunded');
    });

    it('should not allow non-admin to process refund', async () => {
      const payment = await Payment.create({
        order: order._id,
        user: user._id,
        amount: order.total,
        currency: 'USD',
        paymentMethod: 'card',
        status: 'completed'
      });

      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentId: payment._id,
          reason: 'Test',
          amount: payment.amount
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should not refund pending payment', async () => {
      const payment = await Payment.create({
        order: order._id,
        user: user._id,
        amount: order.total,
        currency: 'USD',
        paymentMethod: 'card',
        status: 'pending'
      });

      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          paymentId: payment._id,
          reason: 'Test',
          amount: payment.amount
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should process partial refund', async () => {
      const payment = await Payment.create({
        order: order._id,
        user: user._id,
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'card',
        status: 'completed'
      });

      order.paymentStatus = 'paid';
      await order.save();

      const refundAmount = 50.00;

      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          paymentId: payment._id,
          reason: 'Partial refund',
          amount: refundAmount
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.refund.amount).toBe(refundAmount);
    });
  });

  describe('GET /api/admin/payments (Admin)', () => {
    it('should get all payments for admin', async () => {
      await Payment.create({
        order: order._id,
        user: user._id,
        amount: 99.99,
        currency: 'USD',
        paymentMethod: 'card',
        status: 'completed'
      });

      const response = await request(app)
        .get('/api/admin/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toBeInstanceOf(Array);
      expect(response.body.data.payments.length).toBeGreaterThan(0);
    });

    it('should not allow non-admin to access', async () => {
      const response = await request(app)
        .get('/api/admin/payments')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should filter payments by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await Payment.create({
        order: order._id,
        user: user._id,
        amount: 99.99,
        currency: 'USD',
        paymentMethod: 'card',
        status: 'completed'
      });

      const response = await request(app)
        .get(`/api/admin/payments?startDate=${yesterday.toISOString()}&endDate=${tomorrow.toISOString()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payments.length).toBeGreaterThan(0);
    });

    it('should calculate payment statistics', async () => {
      await Payment.create({
        order: order._id,
        user: user._id,
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'card',
        status: 'completed'
      });

      await Payment.create({
        order: order._id,
        user: user._id,
        amount: 150.00,
        currency: 'USD',
        paymentMethod: 'card',
        status: 'completed'
      });

      const response = await request(app)
        .get('/api/admin/payments/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics).toHaveProperty('totalRevenue');
      expect(response.body.data.statistics).toHaveProperty('totalTransactions');
      expect(response.body.data.statistics.totalRevenue).toBe(250.00);
      expect(response.body.data.statistics.totalTransactions).toBe(2);
    });
  });

  describe('POST /api/payments/webhook', () => {
    it('should handle payment webhook', async () => {
      const webhookData = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            amount: 9999, // Amount in cents
            currency: 'usd',
            metadata: {
              orderId: order._id.toString()
            }
          }
        }
      };

      const response = await request(app)
        .post('/api/payments/webhook')
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle payment failure webhook', async () => {
      const webhookData = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_123',
            metadata: {
              orderId: order._id.toString()
            }
          }
        }
      };

      const response = await request(app)
        .post('/api/payments/webhook')
        .send(webhookData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify order payment status is updated
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.paymentStatus).toBe('failed');
    });
  });
});
