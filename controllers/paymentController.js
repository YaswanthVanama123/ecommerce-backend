import mongoose from 'mongoose';
import Order from '../models/Order.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { sendOrderConfirmationEmail, sendPaymentSuccessEmail, sendRefundEmail } from '../utils/emailService.js';

// Stripe placeholder - uncomment and configure when ready to use
// import Stripe from 'stripe';
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * @desc    Create payment intent for order
 * @route   POST /api/payment/create-intent
 * @access  Private/User
 */
export const createPaymentIntent = async (req, res, next) => {
  try {
    const { orderId, paymentMethod, savePaymentMethod } = req.body;

    // Get order
    const order = await Order.findById(orderId);

    if (!order) {
      return sendError(res, 404, 'Order not found');
    }

    // Verify user owns the order
    if (order.user.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Not authorized to access this order');
    }

    // Check if order is already paid
    if (order.paymentStatus === 'completed') {
      return sendError(res, 400, 'Order is already paid');
    }

    // Check if order is cancelled
    if (order.orderStatus === 'cancelled') {
      return sendError(res, 400, 'Cannot process payment for cancelled order');
    }

    // PLACEHOLDER: Stripe Payment Intent Creation
    // When ready to integrate Stripe, uncomment the following:
    /*
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100), // Convert to cents
      currency: 'inr',
      payment_method_types: [paymentMethod.toLowerCase()],
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        userId: req.user._id.toString()
      },
      description: `Payment for order ${order.orderNumber}`
    });

    // Update order with payment intent ID
    order.paymentDetails = {
      ...order.paymentDetails,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret
    };
    await order.save();

    return sendSuccess(res, 200, {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: order.totalAmount,
      currency: 'INR'
    }, 'Payment intent created successfully');
    */

    // PLACEHOLDER RESPONSE (for development/testing)
    const mockPaymentIntent = {
      paymentIntentId: `pi_mock_${Date.now()}`,
      clientSecret: `pi_mock_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`,
      amount: order.totalAmount,
      currency: 'INR',
      status: 'requires_payment_method',
      orderId: order._id,
      orderNumber: order.orderNumber
    };

    // Store mock payment intent in order
    order.paymentDetails = {
      ...order.paymentDetails,
      paymentIntentId: mockPaymentIntent.paymentIntentId
    };
    await order.save();

    sendSuccess(res, 200, mockPaymentIntent, 'Payment intent created successfully (MOCK)');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify payment and update order
 * @route   POST /api/payment/verify
 * @access  Private/User
 */
export const verifyPayment = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { orderId, paymentIntentId, transactionId, signature } = req.body;

    // Get order
    const order = await Order.findById(orderId).session(session);

    if (!order) {
      await session.abortTransaction();
      return sendError(res, 404, 'Order not found');
    }

    // Verify user owns the order
    if (order.user.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
      return sendError(res, 403, 'Not authorized to access this order');
    }

    // Check if order is already paid
    if (order.paymentStatus === 'completed') {
      await session.abortTransaction();
      return sendError(res, 400, 'Order is already paid');
    }

    // PLACEHOLDER: Stripe Payment Verification
    // When ready to integrate Stripe, uncomment the following:
    /*
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      await session.abortTransaction();
      return sendError(res, 400, 'Payment verification failed');
    }

    // Verify the payment intent belongs to this order
    if (paymentIntent.metadata.orderId !== orderId) {
      await session.abortTransaction();
      return sendError(res, 400, 'Payment intent does not match order');
    }
    */

    // PLACEHOLDER VERIFICATION (for development/testing)
    // In production, implement proper signature verification
    const isValidPayment = true; // Mock validation

    if (!isValidPayment) {
      await session.abortTransaction();
      order.paymentStatus = 'failed';
      await order.save({ session });
      await session.commitTransaction();
      return sendError(res, 400, 'Payment verification failed');
    }

    // Update order payment status
    order.paymentStatus = 'completed';
    order.paymentDetails = {
      ...order.paymentDetails,
      transactionId,
      paidAt: new Date(),
      paymentIntentId
    };

    // Update order status to confirmed
    if (order.orderStatus === 'pending') {
      order.updateStatus('confirmed', 'Payment received and verified');
    }

    await order.save({ session });

    await session.commitTransaction();

    // Send payment success email (placeholder)
    try {
      await sendPaymentSuccessEmail(req.user.email, {
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        transactionId
      });
    } catch (emailError) {
      console.error('Failed to send payment success email:', emailError);
      // Don't fail the request if email fails
    }

    sendSuccess(res, 200, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      transactionId
    }, 'Payment verified successfully');
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Get available payment methods
 * @route   GET /api/payment/methods
 * @access  Private/User
 */
export const getPaymentMethods = async (req, res, next) => {
  try {
    // PLACEHOLDER: In production, this might fetch from Stripe or payment gateway
    const paymentMethods = [
      {
        id: 'cod',
        name: 'Cash on Delivery',
        type: 'COD',
        enabled: true,
        description: 'Pay when you receive your order',
        icon: 'cash'
      },
      {
        id: 'card',
        name: 'Credit/Debit Card',
        type: 'Card',
        enabled: true,
        description: 'Pay securely with your card',
        icon: 'credit-card',
        acceptedCards: ['Visa', 'Mastercard', 'American Express', 'RuPay']
      },
      {
        id: 'upi',
        name: 'UPI',
        type: 'UPI',
        enabled: true,
        description: 'Pay with Google Pay, PhonePe, Paytm',
        icon: 'upi'
      },
      {
        id: 'wallet',
        name: 'Digital Wallet',
        type: 'Wallet',
        enabled: true,
        description: 'Pay with Paytm, PhonePe, Amazon Pay',
        icon: 'wallet'
      }
    ];

    sendSuccess(res, 200, paymentMethods, 'Payment methods fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Process refund for order
 * @route   POST /api/payment/refund
 * @access  Private/Admin
 */
export const processRefund = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { orderId, amount, reason } = req.body;

    // Get order
    const order = await Order.findById(orderId)
      .populate('user', 'email firstName lastName')
      .session(session);

    if (!order) {
      await session.abortTransaction();
      return sendError(res, 404, 'Order not found');
    }

    // Check if order can be refunded
    if (order.paymentStatus !== 'completed') {
      await session.abortTransaction();
      return sendError(res, 400, 'Only completed payments can be refunded');
    }

    if (order.paymentStatus === 'refunded') {
      await session.abortTransaction();
      return sendError(res, 400, 'Order is already refunded');
    }

    // Calculate refund amount (full refund if not specified)
    const refundAmount = amount || order.totalAmount;

    if (refundAmount > order.totalAmount) {
      await session.abortTransaction();
      return sendError(res, 400, 'Refund amount cannot exceed order total');
    }

    // PLACEHOLDER: Stripe Refund Processing
    // When ready to integrate Stripe, uncomment the following:
    /*
    if (order.paymentDetails?.paymentIntentId) {
      const refund = await stripe.refunds.create({
        payment_intent: order.paymentDetails.paymentIntentId,
        amount: Math.round(refundAmount * 100), // Convert to cents
        reason: 'requested_by_customer',
        metadata: {
          orderId: order._id.toString(),
          reason
        }
      });

      order.paymentDetails.refundId = refund.id;
    }
    */

    // Update order payment status
    order.paymentStatus = 'refunded';
    order.paymentDetails = {
      ...order.paymentDetails,
      refundAmount,
      refundedAt: new Date(),
      refundReason: reason,
      refundId: `refund_mock_${Date.now()}` // Mock refund ID
    };

    // Update order status to cancelled if not already
    if (order.orderStatus !== 'cancelled') {
      order.updateStatus('cancelled', `Refund processed: ${reason}`);
    }

    await order.save({ session });

    await session.commitTransaction();

    // Send refund confirmation email (placeholder)
    try {
      await sendRefundEmail(order.user.email, {
        orderNumber: order.orderNumber,
        refundAmount,
        reason
      });
    } catch (emailError) {
      console.error('Failed to send refund email:', emailError);
      // Don't fail the request if email fails
    }

    sendSuccess(res, 200, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      refundAmount,
      paymentStatus: order.paymentStatus,
      refundedAt: order.paymentDetails.refundedAt
    }, 'Refund processed successfully');
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
