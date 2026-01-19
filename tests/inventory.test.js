import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import Product from '../models/Product.js';
import InventoryAdjustment from '../models/InventoryAdjustment.js';
import {
  validInventoryAdjustmentData,
  createTestAdmin,
  createTestUser,
  createTestProduct,
  createTestCategory,
  getAuthToken
} from './fixtures.js';

describe('Inventory API Tests', () => {
  let adminToken;
  let userToken;
  let adminUser;
  let user;
  let product;
  let category;

  beforeEach(async () => {
    // Create users
    adminUser = await createTestAdmin();
    user = await createTestUser();

    adminToken = getAuthToken(adminUser);
    userToken = getAuthToken(user);

    // Create test product
    category = await createTestCategory();
    product = await createTestProduct({
      name: 'Test Product',
      price: 99.99,
      stock: 50,
      sku: 'TEST-001'
    }, category);
  });

  describe('GET /api/inventory', () => {
    it('should get inventory for all products', async () => {
      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.inventory).toBeInstanceOf(Array);
      expect(response.body.data.inventory.length).toBeGreaterThan(0);
    });

    it('should not allow non-admin to access', async () => {
      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should filter products by low stock', async () => {
      // Create low stock product
      await Product.create({
        name: 'Low Stock Product',
        price: 49.99,
        stock: 3,
        sku: 'LOW-001',
        category: category._id,
        lowStockThreshold: 5
      });

      const response = await request(app)
        .get('/api/inventory?lowStock=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.inventory.length).toBeGreaterThan(0);
      response.body.data.inventory.forEach(item => {
        expect(item.stock).toBeLessThanOrEqual(item.lowStockThreshold || 10);
      });
    });

    it('should filter products by out of stock', async () => {
      // Create out of stock product
      await Product.create({
        name: 'Out of Stock Product',
        price: 49.99,
        stock: 0,
        sku: 'OUT-001',
        category: category._id
      });

      const response = await request(app)
        .get('/api/inventory?outOfStock=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.inventory.forEach(item => {
        expect(item.stock).toBe(0);
      });
    });

    it('should search inventory by product name or SKU', async () => {
      const response = await request(app)
        .get(`/api/inventory?search=${product.sku}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.inventory.length).toBe(1);
      expect(response.body.data.inventory[0].sku).toBe(product.sku);
    });

    it('should filter inventory by category', async () => {
      const response = await request(app)
        .get(`/api/inventory?category=${category._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.inventory.forEach(item => {
        expect(item.category._id.toString()).toBe(category._id.toString());
      });
    });
  });

  describe('GET /api/inventory/:productId', () => {
    it('should get inventory for specific product', async () => {
      const response = await request(app)
        .get(`/api/inventory/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product._id.toString()).toBe(product._id.toString());
      expect(response.body.data.product).toHaveProperty('stock');
    });

    it('should include inventory adjustment history', async () => {
      // Create inventory adjustment
      await InventoryAdjustment.create({
        product: product._id,
        type: 'adjustment',
        quantity: 10,
        reason: 'Restocking',
        adjustedBy: adminUser._id
      });

      const response = await request(app)
        .get(`/api/inventory/${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.adjustments).toBeInstanceOf(Array);
      expect(response.body.data.adjustments.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/inventory/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/inventory/adjust', () => {
    it('should increase product stock', async () => {
      const initialStock = product.stock;
      const adjustmentQty = 20;

      const response = await request(app)
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: product._id,
          type: 'addition',
          quantity: adjustmentQty,
          reason: 'Restocking from supplier'
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify stock increased
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(initialStock + adjustmentQty);
    });

    it('should decrease product stock', async () => {
      const initialStock = product.stock;
      const adjustmentQty = 10;

      const response = await request(app)
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: product._id,
          type: 'deduction',
          quantity: adjustmentQty,
          reason: 'Damaged items'
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify stock decreased
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(initialStock - adjustmentQty);
    });

    it('should not allow non-admin to adjust inventory', async () => {
      const response = await request(app)
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: product._id,
          type: 'addition',
          quantity: 10,
          reason: 'Test'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should not allow negative stock', async () => {
      const response = await request(app)
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: product._id,
          type: 'deduction',
          quantity: 1000, // More than available stock
          reason: 'Test'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('insufficient');
    });

    it('should create inventory adjustment record', async () => {
      await request(app)
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: product._id,
          type: 'addition',
          quantity: 10,
          reason: 'Restocking',
          notes: 'From supplier XYZ'
        })
        .expect(200);

      // Verify adjustment record created
      const adjustment = await InventoryAdjustment.findOne({ product: product._id });
      expect(adjustment).toBeDefined();
      expect(adjustment.quantity).toBe(10);
      expect(adjustment.reason).toBe('Restocking');
      expect(adjustment.adjustedBy.toString()).toBe(adminUser._id.toString());
    });

    it('should require reason for adjustment', async () => {
      const response = await request(app)
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: product._id,
          type: 'addition',
          quantity: 10
          // Missing reason
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should update product stock correctly with manual adjustment', async () => {
      const newStock = 100;

      const response = await request(app)
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: product._id,
          type: 'adjustment',
          quantity: newStock,
          reason: 'Manual stock count adjustment'
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify stock set to exact value
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(newStock);
    });
  });

  describe('POST /api/inventory/bulk-adjust', () => {
    it('should adjust multiple products at once', async () => {
      const product2 = await Product.create({
        name: 'Another Product',
        price: 149.99,
        stock: 30,
        sku: 'TEST-002',
        category: category._id
      });

      const adjustments = [
        {
          productId: product._id,
          type: 'addition',
          quantity: 10
        },
        {
          productId: product2._id,
          type: 'deduction',
          quantity: 5
        }
      ];

      const response = await request(app)
        .post('/api/inventory/bulk-adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          adjustments,
          reason: 'Bulk inventory update'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toBe(2);

      // Verify both products updated
      const updatedProduct1 = await Product.findById(product._id);
      const updatedProduct2 = await Product.findById(product2._id);

      expect(updatedProduct1.stock).toBe(60); // 50 + 10
      expect(updatedProduct2.stock).toBe(25); // 30 - 5
    });

    it('should not allow non-admin to bulk adjust', async () => {
      const response = await request(app)
        .post('/api/inventory/bulk-adjust')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          adjustments: [
            {
              productId: product._id,
              type: 'addition',
              quantity: 10
            }
          ],
          reason: 'Test'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should rollback all changes if any adjustment fails', async () => {
      const product2 = await Product.create({
        name: 'Another Product',
        price: 149.99,
        stock: 5,
        sku: 'TEST-002',
        category: category._id
      });

      const initialStock1 = product.stock;
      const initialStock2 = product2.stock;

      const adjustments = [
        {
          productId: product._id,
          type: 'addition',
          quantity: 10
        },
        {
          productId: product2._id,
          type: 'deduction',
          quantity: 100 // This will fail - insufficient stock
        }
      ];

      const response = await request(app)
        .post('/api/inventory/bulk-adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          adjustments,
          reason: 'Bulk update'
        })
        .expect(400);

      expect(response.body.success).toBe(false);

      // Verify no products were updated
      const product1Check = await Product.findById(product._id);
      const product2Check = await Product.findById(product2._id);

      expect(product1Check.stock).toBe(initialStock1);
      expect(product2Check.stock).toBe(initialStock2);
    });
  });

  describe('GET /api/inventory/adjustments', () => {
    it('should get all inventory adjustments', async () => {
      // Create some adjustments
      await InventoryAdjustment.create({
        product: product._id,
        type: 'addition',
        quantity: 10,
        reason: 'Restocking',
        adjustedBy: adminUser._id
      });

      const response = await request(app)
        .get('/api/inventory/adjustments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.adjustments).toBeInstanceOf(Array);
      expect(response.body.data.adjustments.length).toBeGreaterThan(0);
    });

    it('should filter adjustments by product', async () => {
      await InventoryAdjustment.create({
        product: product._id,
        type: 'addition',
        quantity: 10,
        reason: 'Restocking',
        adjustedBy: adminUser._id
      });

      const response = await request(app)
        .get(`/api/inventory/adjustments?productId=${product._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.adjustments.forEach(adj => {
        expect(adj.product._id.toString()).toBe(product._id.toString());
      });
    });

    it('should filter adjustments by type', async () => {
      await InventoryAdjustment.create({
        product: product._id,
        type: 'addition',
        quantity: 10,
        reason: 'Restocking',
        adjustedBy: adminUser._id
      });

      const response = await request(app)
        .get('/api/inventory/adjustments?type=addition')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.adjustments.forEach(adj => {
        expect(adj.type).toBe('addition');
      });
    });

    it('should filter adjustments by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await InventoryAdjustment.create({
        product: product._id,
        type: 'addition',
        quantity: 10,
        reason: 'Restocking',
        adjustedBy: adminUser._id
      });

      const response = await request(app)
        .get(`/api/inventory/adjustments?startDate=${yesterday.toISOString()}&endDate=${tomorrow.toISOString()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.adjustments.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/inventory/low-stock-alert', () => {
    it('should send alert for low stock products', async () => {
      // Create low stock product
      await Product.create({
        name: 'Low Stock Product',
        price: 49.99,
        stock: 3,
        sku: 'LOW-001',
        category: category._id,
        lowStockThreshold: 5
      });

      const response = await request(app)
        .post('/api/inventory/low-stock-alert')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.alertsSent).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/inventory/:productId/threshold', () => {
    it('should update low stock threshold', async () => {
      const newThreshold = 15;

      const response = await request(app)
        .put(`/api/inventory/${product._id}/threshold`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          lowStockThreshold: newThreshold
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify threshold updated
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.lowStockThreshold).toBe(newThreshold);
    });

    it('should not allow non-admin to update threshold', async () => {
      const response = await request(app)
        .put(`/api/inventory/${product._id}/threshold`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          lowStockThreshold: 15
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/inventory/reports/summary', () => {
    it('should get inventory summary report', async () => {
      const response = await request(app)
        .get('/api/inventory/reports/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toHaveProperty('totalProducts');
      expect(response.body.data.summary).toHaveProperty('totalStockValue');
      expect(response.body.data.summary).toHaveProperty('lowStockCount');
      expect(response.body.data.summary).toHaveProperty('outOfStockCount');
    });

    it('should calculate total stock value correctly', async () => {
      // Create another product
      await Product.create({
        name: 'Another Product',
        price: 100.00,
        stock: 10,
        sku: 'TEST-002',
        category: category._id
      });

      const response = await request(app)
        .get('/api/inventory/reports/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalStockValue).toBeGreaterThan(0);
    });
  });

  describe('POST /api/inventory/reserve', () => {
    it('should reserve stock for pending order', async () => {
      const initialStock = product.stock;
      const reserveQty = 5;

      const response = await request(app)
        .post('/api/inventory/reserve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: product._id,
          quantity: reserveQty,
          orderId: new mongoose.Types.ObjectId()
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify stock reserved (available stock reduced but total stock same)
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.stock).toBe(initialStock);
      expect(updatedProduct.reservedStock || 0).toBe(reserveQty);
    });

    it('should not reserve more than available stock', async () => {
      const response = await request(app)
        .post('/api/inventory/reserve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: product._id,
          quantity: 1000,
          orderId: new mongoose.Types.ObjectId()
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/inventory/release', () => {
    it('should release reserved stock', async () => {
      const reserveQty = 5;
      const orderId = new mongoose.Types.ObjectId();

      // First reserve
      await request(app)
        .post('/api/inventory/reserve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: product._id,
          quantity: reserveQty,
          orderId
        });

      // Then release
      const response = await request(app)
        .post('/api/inventory/release')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: product._id,
          quantity: reserveQty,
          orderId
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify reserved stock released
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.reservedStock || 0).toBe(0);
    });
  });
});
