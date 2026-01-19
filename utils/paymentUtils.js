import crypto from 'crypto';

// Razorpay integration utilities
// Note: Install razorpay SDK: npm install razorpay

// Initialize Razorpay (uncomment when ready to use)
// import Razorpay from 'razorpay';
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET
// });

/**
 * Create Razorpay order
 * @param {number} amount - Amount in rupees
 * @param {string} currency - Currency code (default: INR)
 * @param {object} metadata - Additional metadata
 * @returns {Promise<object>} Razorpay order object
 */
export const createRazorpayOrder = async (amount, currency = 'INR', metadata = {}) => {
  try {
    // MOCK implementation - replace with actual Razorpay when ready
    // const order = await razorpay.orders.create({
    //   amount: Math.round(amount * 100), // Convert to paise
    //   currency,
    //   receipt: `receipt_${Date.now()}`,
    //   notes: metadata
    // });

    // Mock response for development
    const order = {
      id: `order_mock_${Date.now()}`,
      entity: 'order',
      amount: Math.round(amount * 100),
      amount_paid: 0,
      amount_due: Math.round(amount * 100),
      currency,
      receipt: `receipt_${Date.now()}`,
      status: 'created',
      attempts: 0,
      notes: metadata,
      created_at: Math.floor(Date.now() / 1000)
    };

    return order;
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    throw new Error('Failed to create payment order');
  }
};

/**
 * Verify Razorpay payment signature
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Razorpay signature
 * @returns {boolean} Verification result
 */
export const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret_key';

    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
};

/**
 * Fetch payment details from Razorpay
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<object>} Payment details
 */
export const fetchPaymentDetails = async (paymentId) => {
  try {
    // MOCK implementation
    // const payment = await razorpay.payments.fetch(paymentId);

    const payment = {
      id: paymentId,
      entity: 'payment',
      amount: 50000,
      currency: 'INR',
      status: 'captured',
      method: 'card',
      captured: true,
      email: 'customer@example.com',
      contact: '+919876543210',
      created_at: Math.floor(Date.now() / 1000)
    };

    return payment;
  } catch (error) {
    console.error('Fetch payment details error:', error);
    throw new Error('Failed to fetch payment details');
  }
};

/**
 * Process refund through Razorpay
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} amount - Refund amount in rupees (optional, full refund if not provided)
 * @param {object} metadata - Additional metadata
 * @returns {Promise<object>} Refund object
 */
export const processRazorpayRefund = async (paymentId, amount = null, metadata = {}) => {
  try {
    // MOCK implementation
    // const refundData = {
    //   notes: metadata
    // };
    // if (amount) {
    //   refundData.amount = Math.round(amount * 100);
    // }
    // const refund = await razorpay.payments.refund(paymentId, refundData);

    const refund = {
      id: `rfnd_mock_${Date.now()}`,
      entity: 'refund',
      amount: amount ? Math.round(amount * 100) : null,
      currency: 'INR',
      payment_id: paymentId,
      status: 'processed',
      speed_requested: 'normal',
      speed_processed: 'normal',
      created_at: Math.floor(Date.now() / 1000)
    };

    return refund;
  } catch (error) {
    console.error('Razorpay refund error:', error);
    throw new Error('Failed to process refund');
  }
};

/**
 * Create customer in Razorpay for card tokenization
 * @param {object} customerData - Customer data
 * @returns {Promise<object>} Customer object
 */
export const createRazorpayCustomer = async (customerData) => {
  try {
    // MOCK implementation
    // const customer = await razorpay.customers.create({
    //   name: customerData.name,
    //   email: customerData.email,
    //   contact: customerData.phone,
    //   notes: customerData.metadata || {}
    // });

    const customer = {
      id: `cust_mock_${Date.now()}`,
      entity: 'customer',
      name: customerData.name,
      email: customerData.email,
      contact: customerData.phone,
      gstin: null,
      notes: customerData.metadata || {},
      created_at: Math.floor(Date.now() / 1000)
    };

    return customer;
  } catch (error) {
    console.error('Create customer error:', error);
    throw new Error('Failed to create customer');
  }
};

/**
 * Create payment link for pending payments
 * @param {number} amount - Amount in rupees
 * @param {object} customerData - Customer data
 * @param {object} metadata - Additional metadata
 * @returns {Promise<object>} Payment link object
 */
export const createPaymentLink = async (amount, customerData, metadata = {}) => {
  try {
    // MOCK implementation
    // const paymentLink = await razorpay.paymentLink.create({
    //   amount: Math.round(amount * 100),
    //   currency: 'INR',
    //   description: metadata.description || 'Payment for order',
    //   customer: {
    //     name: customerData.name,
    //     email: customerData.email,
    //     contact: customerData.phone
    //   },
    //   notify: {
    //     sms: true,
    //     email: true
    //   },
    //   reminder_enable: true,
    //   notes: metadata.notes || {},
    //   callback_url: metadata.callbackUrl,
    //   callback_method: 'get'
    // });

    const paymentLink = {
      id: `plink_mock_${Date.now()}`,
      short_url: `https://rzp.io/i/mock${Date.now()}`,
      amount: Math.round(amount * 100),
      currency: 'INR',
      description: metadata.description || 'Payment for order',
      customer: customerData,
      status: 'created',
      created_at: Math.floor(Date.now() / 1000),
      expire_by: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    return paymentLink;
  } catch (error) {
    console.error('Create payment link error:', error);
    throw new Error('Failed to create payment link');
  }
};

/**
 * Calculate COD charges based on order amount
 * @param {number} orderAmount - Order amount in rupees
 * @returns {number} COD charges
 */
export const calculateCODCharges = (orderAmount) => {
  // Example COD charge structure
  if (orderAmount < 500) {
    return 40; // Flat ₹40 for orders below ₹500
  } else if (orderAmount < 1000) {
    return 50; // Flat ₹50 for orders below ₹1000
  } else if (orderAmount < 2000) {
    return 60; // Flat ₹60 for orders below ₹2000
  } else {
    // 3% of order amount for orders above ₹2000
    return Math.min(Math.round(orderAmount * 0.03), 200); // Max ₹200
  }
};

/**
 * Calculate EMI options for a given amount
 * @param {number} amount - Total amount in rupees
 * @returns {array} EMI options with tenure and monthly installment
 */
export const calculateEMIOptions = (amount) => {
  const emiOptions = [];

  // Only offer EMI for amounts above ₹3000
  if (amount < 3000) {
    return emiOptions;
  }

  const tenures = [
    { months: 3, rate: 0.12 }, // 12% annual interest
    { months: 6, rate: 0.13 },
    { months: 9, rate: 0.14 },
    { months: 12, rate: 0.15 }
  ];

  tenures.forEach(tenure => {
    const monthlyRate = tenure.rate / 12;
    const emi = (amount * monthlyRate * Math.pow(1 + monthlyRate, tenure.months)) /
                 (Math.pow(1 + monthlyRate, tenure.months) - 1);

    const totalAmount = emi * tenure.months;
    const interestAmount = totalAmount - amount;

    emiOptions.push({
      tenure: tenure.months,
      monthlyEMI: Math.round(emi),
      totalAmount: Math.round(totalAmount),
      interestAmount: Math.round(interestAmount),
      interestRate: (tenure.rate * 100).toFixed(2) + '%',
      available: true
    });
  });

  return emiOptions;
};

/**
 * Fraud score calculation based on various factors
 * @param {object} paymentData - Payment data
 * @returns {number} Fraud score (0-100)
 */
export const calculateFraudScore = (paymentData) => {
  let score = 0;

  // Check for suspicious patterns
  const {
    amount,
    method,
    ipAddress,
    userAgent,
    orderHistory,
    userAge, // Account age in days
    emailVerified,
    phoneVerified
  } = paymentData;

  // High amount transactions
  if (amount > 50000) score += 20;
  else if (amount > 25000) score += 10;

  // New user with no history
  if (!orderHistory || orderHistory.length === 0) score += 15;

  // Very new account
  if (userAge < 7) score += 15;
  else if (userAge < 30) score += 10;

  // Unverified contact info
  if (!emailVerified) score += 10;
  if (!phoneVerified) score += 10;

  // Multiple rapid transactions
  if (orderHistory && orderHistory.length > 5) {
    const recentOrders = orderHistory.filter(o => {
      const orderDate = new Date(o.createdAt);
      const hoursSince = (Date.now() - orderDate) / (1000 * 60 * 60);
      return hoursSince < 24;
    });
    if (recentOrders.length > 3) score += 20;
  }

  return Math.min(score, 100);
};

/**
 * Format amount for gateway (convert to smallest currency unit)
 * @param {number} amount - Amount in rupees
 * @param {string} currency - Currency code
 * @returns {number} Amount in smallest unit (paise for INR)
 */
export const formatAmountForGateway = (amount, currency = 'INR') => {
  // For INR, convert to paise (multiply by 100)
  if (currency === 'INR') {
    return Math.round(amount * 100);
  }
  return Math.round(amount * 100); // Default: 2 decimal places
};

/**
 * Format amount from gateway (convert from smallest currency unit)
 * @param {number} amount - Amount in smallest unit
 * @param {string} currency - Currency code
 * @returns {number} Amount in major unit (rupees for INR)
 */
export const formatAmountFromGateway = (amount, currency = 'INR') => {
  // For INR, convert from paise (divide by 100)
  if (currency === 'INR') {
    return amount / 100;
  }
  return amount / 100; // Default: 2 decimal places
};

/**
 * Generate transaction ID
 * @param {string} prefix - Prefix for transaction ID
 * @returns {string} Transaction ID
 */
export const generateTransactionId = (prefix = 'TXN') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
};

/**
 * Validate payment method availability
 * @param {string} method - Payment method
 * @param {number} amount - Transaction amount
 * @returns {object} Validation result
 */
export const validatePaymentMethod = (method, amount) => {
  const methods = {
    cod: {
      minAmount: 0,
      maxAmount: 50000,
      enabled: true
    },
    card: {
      minAmount: 1,
      maxAmount: 500000,
      enabled: true
    },
    upi: {
      minAmount: 1,
      maxAmount: 100000,
      enabled: true
    },
    wallet: {
      minAmount: 1,
      maxAmount: 100000,
      enabled: true
    },
    emi: {
      minAmount: 3000,
      maxAmount: 500000,
      enabled: true
    }
  };

  const methodConfig = methods[method.toLowerCase()];

  if (!methodConfig) {
    return { valid: false, message: 'Invalid payment method' };
  }

  if (!methodConfig.enabled) {
    return { valid: false, message: 'Payment method is currently unavailable' };
  }

  if (amount < methodConfig.minAmount) {
    return { valid: false, message: `Minimum amount for ${method} is ₹${methodConfig.minAmount}` };
  }

  if (amount > methodConfig.maxAmount) {
    return { valid: false, message: `Maximum amount for ${method} is ₹${methodConfig.maxAmount}` };
  }

  return { valid: true };
};

/**
 * Get payment method display info
 * @param {string} method - Payment method
 * @returns {object} Display info
 */
export const getPaymentMethodInfo = (method) => {
  const methodsInfo = {
    razorpay: {
      name: 'Razorpay',
      icon: '💳',
      description: 'Pay with Cards, UPI, Wallets'
    },
    paytm: {
      name: 'Paytm',
      icon: '📱',
      description: 'Pay with Paytm Wallet or UPI'
    },
    phonepe: {
      name: 'PhonePe',
      icon: '📱',
      description: 'Pay with PhonePe UPI'
    },
    gpay: {
      name: 'Google Pay',
      icon: '🔵',
      description: 'Pay with Google Pay UPI'
    },
    cod: {
      name: 'Cash on Delivery',
      icon: '💵',
      description: 'Pay with cash when you receive'
    },
    wallet: {
      name: 'Wallet',
      icon: '👛',
      description: 'Pay with your wallet balance'
    },
    emi: {
      name: 'EMI',
      icon: '🏦',
      description: 'Pay in easy monthly installments'
    },
    card: {
      name: 'Credit/Debit Card',
      icon: '💳',
      description: 'Pay with your card'
    },
    upi: {
      name: 'UPI',
      icon: '📱',
      description: 'Pay with any UPI app'
    }
  };

  return methodsInfo[method.toLowerCase()] || {
    name: method,
    icon: '💰',
    description: 'Make payment'
  };
};

export default {
  createRazorpayOrder,
  verifyRazorpaySignature,
  fetchPaymentDetails,
  processRazorpayRefund,
  createRazorpayCustomer,
  createPaymentLink,
  calculateCODCharges,
  calculateEMIOptions,
  calculateFraudScore,
  formatAmountForGateway,
  formatAmountFromGateway,
  generateTransactionId,
  validatePaymentMethod,
  getPaymentMethodInfo
};
