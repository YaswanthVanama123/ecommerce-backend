import {
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderCancellationEmail,
  sendRefundEmail,
  sendPasswordResetEmail,
  sendInvoiceEmail,
  sendLowStockAlert,
  sendReturnRequestEmail,
  testEmailConfiguration
} from '../utils/emailService.js';
import {
  getWelcomeEmailData,
  getOrderConfirmationData,
  getOrderShippedData,
  getOrderDeliveredData,
  getOrderCancelledData,
  getRefundProcessedData,
  getPasswordResetData,
  getInvoiceEmailData,
  getLowStockAlertData,
  getReturnRequestData,
  renderEmailTemplate
} from '../utils/emailTemplates.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Return from '../models/Return.js';

/**
 * Email Controller
 *
 * Handles email-related operations:
 * - Test email configuration
 * - Send test emails
 * - Preview email templates
 * - Resend emails for orders
 */

/**
 * Test email configuration
 * @route GET /api/email/test-config
 */
export const testConfig = async (req, res) => {
  try {
    const result = await testEmailConfiguration();

    res.status(200).json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('Error testing email configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test email configuration',
      error: error.message
    });
  }
};

/**
 * Send test email
 * @route POST /api/email/send-test
 */
export const sendTestEmail = async (req, res) => {
  try {
    const { email, templateType = 'welcome' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    // Create mock data based on template type
    const mockUser = {
      name: 'Test User',
      firstName: 'Test',
      email: email
    };

    const mockOrder = {
      _id: 'test123',
      orderNumber: 'ORD-TEST-001',
      totalAmount: 2499.99,
      subtotal: 2299.99,
      shippingCost: 100,
      tax: 100,
      discount: 0,
      items: [
        {
          name: 'Test Product 1',
          quantity: 2,
          price: 999.99,
          size: 'M',
          color: 'Blue'
        },
        {
          name: 'Test Product 2',
          quantity: 1,
          price: 1299.99,
          size: 'L',
          color: 'Red'
        }
      ],
      shippingAddress: {
        fullName: 'Test User',
        addressLine1: '123 Test Street',
        addressLine2: 'Apt 4B',
        city: 'Test City',
        state: 'TC',
        zipCode: '12345',
        phone: '+1234567890'
      },
      paymentMethod: 'Credit Card',
      trackingNumber: 'TRACK123456',
      carrier: 'Test Courier',
      createdAt: new Date()
    };

    let result;

    switch (templateType) {
      case 'welcome':
        result = await sendWelcomeEmail(email, mockUser);
        break;

      case 'orderConfirmation':
        result = await sendOrderConfirmationEmail(email, mockOrder, mockUser);
        break;

      case 'orderShipped':
        result = await sendOrderShippedEmail(email, mockOrder, mockUser);
        break;

      case 'orderDelivered':
        result = await sendOrderDeliveredEmail(email, mockOrder, mockUser);
        break;

      case 'orderCancelled':
        result = await sendOrderCancellationEmail(email, mockOrder, mockUser, 'Test cancellation');
        break;

      case 'refund':
        result = await sendRefundEmail(email, mockOrder, mockUser, 2499.99, 'Test refund');
        break;

      case 'passwordReset':
        result = await sendPasswordResetEmail(email, mockUser, 'test-token-123');
        break;

      case 'invoice':
        result = await sendInvoiceEmail(email, mockOrder, mockUser, 'INV-TEST-001');
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid template type'
        });
    }

    res.status(200).json({
      success: true,
      message: `Test ${templateType} email sent successfully to ${email}`,
      result
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
};

/**
 * Preview email template
 * @route POST /api/email/preview
 */
export const previewEmail = async (req, res) => {
  try {
    const { templateType, orderId, userId, productId, returnId } = req.body;

    if (!templateType) {
      return res.status(400).json({
        success: false,
        message: 'Template type is required'
      });
    }

    let html;
    let data;

    // Mock data for preview
    const mockUser = {
      name: 'John Doe',
      firstName: 'John',
      email: 'john@example.com'
    };

    const mockOrder = {
      _id: 'preview123',
      orderNumber: 'ORD-PREVIEW-001',
      totalAmount: 2499.99,
      subtotal: 2299.99,
      shippingCost: 100,
      tax: 100,
      discount: 0,
      items: [
        {
          name: 'Stylish T-Shirt',
          quantity: 2,
          price: 999.99,
          size: 'M',
          color: 'Blue'
        }
      ],
      shippingAddress: {
        fullName: 'John Doe',
        addressLine1: '123 Fashion Avenue',
        city: 'Style City',
        state: 'SC',
        zipCode: '12345',
        phone: '+1234567890'
      },
      paymentMethod: 'Credit Card',
      trackingNumber: 'TRACK123456',
      carrier: 'Express Shipping',
      createdAt: new Date()
    };

    // Try to get real data if IDs provided
    let user = mockUser;
    let order = mockOrder;

    if (userId) {
      const foundUser = await User.findById(userId);
      if (foundUser) user = foundUser;
    }

    if (orderId) {
      const foundOrder = await Order.findById(orderId).populate('items.product');
      if (foundOrder) order = foundOrder;
    }

    switch (templateType) {
      case 'welcome':
        data = getWelcomeEmailData(user);
        html = renderEmailTemplate('welcome', data);
        break;

      case 'orderConfirmation':
        data = getOrderConfirmationData(order, user);
        html = renderEmailTemplate('orderConfirmation', data);
        break;

      case 'orderShipped':
        data = getOrderShippedData(order, user);
        html = renderEmailTemplate('orderShipped', data);
        break;

      case 'orderDelivered':
        data = getOrderDeliveredData(order, user);
        html = renderEmailTemplate('orderDelivered', data);
        break;

      case 'orderCancelled':
        data = getOrderCancelledData(order, user, 'Customer request');
        html = renderEmailTemplate('orderCancelled', data);
        break;

      case 'refund':
        data = getRefundProcessedData(order, user, order.totalAmount, 'Product return');
        html = renderEmailTemplate('refundProcessed', data);
        break;

      case 'passwordReset':
        data = getPasswordResetData(user, 'preview-token-123');
        html = renderEmailTemplate('passwordReset', data);
        break;

      case 'invoice':
        data = getInvoiceEmailData(order, user, `INV-${order.orderNumber}`);
        html = renderEmailTemplate('invoice', data);
        break;

      case 'lowStockAlert':
        let product = {
          name: 'Sample Product',
          sku: 'SKU-12345',
          lowStockThreshold: 10,
          images: ['https://via.placeholder.com/80']
        };
        if (productId) {
          const foundProduct = await Product.findById(productId);
          if (foundProduct) product = foundProduct;
        }
        data = getLowStockAlertData(product, 5);
        html = renderEmailTemplate('lowStockAlert', data);
        break;

      case 'returnRequest':
        const mockReturn = {
          _id: 'return123',
          returnNumber: 'RET-001',
          reason: 'Size too small',
          quantity: 1,
          itemName: 'Stylish T-Shirt',
          refundAmount: 999.99,
          status: 'Pending',
          createdAt: new Date()
        };
        let returnRequest = mockReturn;
        if (returnId) {
          const foundReturn = await Return.findById(returnId);
          if (foundReturn) returnRequest = foundReturn;
        }
        data = getReturnRequestData(returnRequest, order, user);
        html = renderEmailTemplate('returnRequest', data);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid template type'
        });
    }

    res.status(200).send(html);
  } catch (error) {
    console.error('Error previewing email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview email',
      error: error.message
    });
  }
};

/**
 * Resend order confirmation email
 * @route POST /api/email/resend-order-confirmation
 */
export const resendOrderConfirmation = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const order = await Order.findById(orderId).populate('user');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const user = order.user;
    if (!user || !user.email) {
      return res.status(400).json({
        success: false,
        message: 'User email not found'
      });
    }

    await sendOrderConfirmationEmail(user.email, order, user);

    res.status(200).json({
      success: true,
      message: `Order confirmation email resent to ${user.email}`
    });
  } catch (error) {
    console.error('Error resending order confirmation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend order confirmation',
      error: error.message
    });
  }
};

/**
 * Resend order shipped email
 * @route POST /api/email/resend-order-shipped
 */
export const resendOrderShipped = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const order = await Order.findById(orderId).populate('user');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status !== 'shipped' && order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Order has not been shipped yet'
      });
    }

    const user = order.user;
    if (!user || !user.email) {
      return res.status(400).json({
        success: false,
        message: 'User email not found'
      });
    }

    await sendOrderShippedEmail(user.email, order, user);

    res.status(200).json({
      success: true,
      message: `Order shipped email resent to ${user.email}`
    });
  } catch (error) {
    console.error('Error resending order shipped email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend order shipped email',
      error: error.message
    });
  }
};

/**
 * Resend invoice email
 * @route POST /api/email/resend-invoice
 */
export const resendInvoice = async (req, res) => {
  try {
    const { orderId, invoiceNumber } = req.body;

    if (!orderId || !invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and invoice number are required'
      });
    }

    const order = await Order.findById(orderId).populate('user');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const user = order.user;
    if (!user || !user.email) {
      return res.status(400).json({
        success: false,
        message: 'User email not found'
      });
    }

    await sendInvoiceEmail(user.email, order, user, invoiceNumber);

    res.status(200).json({
      success: true,
      message: `Invoice email resent to ${user.email}`
    });
  } catch (error) {
    console.error('Error resending invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend invoice',
      error: error.message
    });
  }
};

/**
 * Get list of available email templates
 * @route GET /api/email/templates
 */
export const getTemplates = async (req, res) => {
  try {
    const templates = [
      { id: 'welcome', name: 'Welcome Email', description: 'Sent to new users upon registration' },
      { id: 'orderConfirmation', name: 'Order Confirmation', description: 'Sent when order is placed' },
      { id: 'orderShipped', name: 'Order Shipped', description: 'Sent when order is shipped' },
      { id: 'orderDelivered', name: 'Order Delivered', description: 'Sent when order is delivered' },
      { id: 'orderCancelled', name: 'Order Cancelled', description: 'Sent when order is cancelled' },
      { id: 'refund', name: 'Refund Processed', description: 'Sent when refund is processed' },
      { id: 'passwordReset', name: 'Password Reset', description: 'Sent for password reset requests' },
      { id: 'invoice', name: 'Invoice', description: 'Order invoice with details' },
      { id: 'lowStockAlert', name: 'Low Stock Alert', description: 'Admin alert for low stock products' },
      { id: 'returnRequest', name: 'Return Request', description: 'Sent when return request is submitted' }
    ];

    res.status(200).json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get templates',
      error: error.message
    });
  }
};

export default {
  testConfig,
  sendTestEmail,
  previewEmail,
  resendOrderConfirmation,
  resendOrderShipped,
  resendInvoice,
  getTemplates
};
