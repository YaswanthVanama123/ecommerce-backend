import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Email Templates Utility
 *
 * This module provides functions to load and render HTML email templates
 * with dynamic data for StyleHub e-commerce platform.
 */

// Template directory path
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates');

/**
 * Load and render an email template
 * @param {string} templateName - Name of the template file (without .html)
 * @param {object} data - Data to inject into the template
 * @returns {string} - Rendered HTML
 */
const renderTemplate = (templateName, data) => {
  try {
    const templatePath = path.join(TEMPLATE_DIR, `${templateName}.html`);
    let html = fs.readFileSync(templatePath, 'utf-8');

    // Replace all placeholders with actual data
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, data[key] || '');
    });

    // Remove any remaining placeholders
    html = html.replace(/{{.*?}}/g, '');

    return html;
  } catch (error) {
    console.error(`Error rendering template ${templateName}:`, error);
    throw new Error(`Failed to render email template: ${templateName}`);
  }
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency
 */
const formatCurrency = (amount) => {
  return `₹${parseFloat(amount).toFixed(2)}`;
};

/**
 * Format date
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date
 */
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format items list for email
 * @param {Array} items - Order items
 * @returns {string} - HTML formatted items
 */
const formatItemsList = (items) => {
  if (!items || items.length === 0) return '';

  return items.map(item => `
    <tr>
      <td style="padding: 15px; border-bottom: 1px solid #eee;">
        <div style="display: flex; align-items: center;">
          ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 15px;">` : ''}
          <div>
            <p style="margin: 0; font-weight: 600; color: #333;">${item.name}</p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
              ${item.size ? `Size: ${item.size} | ` : ''}
              ${item.color ? `Color: ${item.color} | ` : ''}
              Qty: ${item.quantity}
            </p>
          </div>
        </div>
      </td>
      <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">
        ${formatCurrency(item.price * item.quantity)}
      </td>
    </tr>
  `).join('');
};

/**
 * Welcome Email Template Data
 * @param {object} user - User data
 * @returns {object} - Template data
 */
export const getWelcomeEmailData = (user) => {
  return {
    userName: user.name || user.firstName || 'Valued Customer',
    userEmail: user.email,
    currentYear: new Date().getFullYear(),
    shopUrl: process.env.CLIENT_URL || 'https://stylehub.com',
    accountUrl: `${process.env.CLIENT_URL || 'https://stylehub.com'}/account`
  };
};

/**
 * Order Confirmation Email Template Data
 * @param {object} order - Order data
 * @param {object} user - User data
 * @returns {object} - Template data
 */
export const getOrderConfirmationData = (order, user) => {
  const itemsHtml = formatItemsList(order.items);

  return {
    userName: user.name || user.firstName || 'Valued Customer',
    orderNumber: order.orderNumber,
    orderDate: formatDate(order.createdAt || new Date()),
    itemsList: itemsHtml,
    subtotal: formatCurrency(order.subtotal || order.totalAmount),
    shippingCost: formatCurrency(order.shippingCost || 0),
    tax: formatCurrency(order.tax || 0),
    discount: order.discount ? formatCurrency(order.discount) : formatCurrency(0),
    totalAmount: formatCurrency(order.totalAmount),
    shippingName: order.shippingAddress?.fullName || user.name,
    shippingAddress: order.shippingAddress?.addressLine1 || '',
    shippingAddress2: order.shippingAddress?.addressLine2 || '',
    shippingCity: order.shippingAddress?.city || '',
    shippingState: order.shippingAddress?.state || '',
    shippingZip: order.shippingAddress?.zipCode || '',
    shippingPhone: order.shippingAddress?.phone || user.phone || '',
    paymentMethod: order.paymentMethod || 'Online Payment',
    currentYear: new Date().getFullYear(),
    orderTrackUrl: `${process.env.CLIENT_URL || 'https://stylehub.com'}/orders/${order._id}`
  };
};

/**
 * Order Shipped Email Template Data
 * @param {object} order - Order data
 * @param {object} user - User data
 * @returns {object} - Template data
 */
export const getOrderShippedData = (order, user) => {
  return {
    userName: user.name || user.firstName || 'Valued Customer',
    orderNumber: order.orderNumber,
    trackingNumber: order.trackingNumber || 'Not Available',
    carrier: order.carrier || 'Standard Shipping',
    shippedDate: formatDate(order.shippedAt || new Date()),
    estimatedDelivery: order.estimatedDelivery ? formatDate(order.estimatedDelivery) : '3-5 business days',
    trackingUrl: order.trackingUrl || `${process.env.CLIENT_URL}/orders/${order._id}`,
    shippingAddress: order.shippingAddress?.addressLine1 || '',
    shippingCity: order.shippingAddress?.city || '',
    shippingState: order.shippingAddress?.state || '',
    shippingZip: order.shippingAddress?.zipCode || '',
    currentYear: new Date().getFullYear(),
    orderTrackUrl: `${process.env.CLIENT_URL || 'https://stylehub.com'}/orders/${order._id}`
  };
};

/**
 * Order Delivered Email Template Data
 * @param {object} order - Order data
 * @param {object} user - User data
 * @returns {object} - Template data
 */
export const getOrderDeliveredData = (order, user) => {
  return {
    userName: user.name || user.firstName || 'Valued Customer',
    orderNumber: order.orderNumber,
    deliveredDate: formatDate(order.deliveredAt || new Date()),
    totalAmount: formatCurrency(order.totalAmount),
    reviewUrl: `${process.env.CLIENT_URL || 'https://stylehub.com'}/orders/${order._id}/review`,
    orderUrl: `${process.env.CLIENT_URL || 'https://stylehub.com'}/orders/${order._id}`,
    supportUrl: `${process.env.CLIENT_URL || 'https://stylehub.com'}/support`,
    currentYear: new Date().getFullYear()
  };
};

/**
 * Order Cancelled Email Template Data
 * @param {object} order - Order data
 * @param {object} user - User data
 * @param {string} reason - Cancellation reason
 * @returns {object} - Template data
 */
export const getOrderCancelledData = (order, user, reason = '') => {
  return {
    userName: user.name || user.firstName || 'Valued Customer',
    orderNumber: order.orderNumber,
    cancelledDate: formatDate(new Date()),
    reason: reason || 'As per your request',
    refundAmount: formatCurrency(order.totalAmount),
    paymentMethod: order.paymentMethod || 'Original Payment Method',
    shopUrl: `${process.env.CLIENT_URL || 'https://stylehub.com'}/shop`,
    supportUrl: `${process.env.CLIENT_URL || 'https://stylehub.com'}/support`,
    currentYear: new Date().getFullYear()
  };
};

/**
 * Refund Processed Email Template Data
 * @param {object} order - Order data
 * @param {object} user - User data
 * @param {number} refundAmount - Refund amount
 * @param {string} reason - Refund reason
 * @returns {object} - Template data
 */
export const getRefundProcessedData = (order, user, refundAmount, reason = '') => {
  return {
    userName: user.name || user.firstName || 'Valued Customer',
    orderNumber: order.orderNumber,
    refundAmount: formatCurrency(refundAmount),
    refundDate: formatDate(new Date()),
    reason: reason || 'As per your request',
    paymentMethod: order.paymentMethod || 'Original Payment Method',
    transactionId: order.transactionId || 'N/A',
    processingTime: '5-7 business days',
    supportUrl: `${process.env.CLIENT_URL || 'https://stylehub.com'}/support`,
    currentYear: new Date().getFullYear()
  };
};

/**
 * Password Reset Email Template Data
 * @param {object} user - User data
 * @param {string} resetToken - Reset token
 * @returns {object} - Template data
 */
export const getPasswordResetData = (user, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL || 'https://stylehub.com'}/reset-password/${resetToken}`;

  return {
    userName: user.name || user.firstName || 'User',
    resetUrl: resetUrl,
    expiryTime: '1 hour',
    supportUrl: `${process.env.CLIENT_URL || 'https://stylehub.com'}/support`,
    currentYear: new Date().getFullYear()
  };
};

/**
 * Invoice Email Template Data
 * @param {object} order - Order data
 * @param {object} user - User data
 * @param {string} invoiceNumber - Invoice number
 * @returns {object} - Template data
 */
export const getInvoiceEmailData = (order, user, invoiceNumber) => {
  const itemsHtml = formatItemsList(order.items);

  return {
    userName: user.name || user.firstName || 'Valued Customer',
    invoiceNumber: invoiceNumber,
    invoiceDate: formatDate(new Date()),
    orderNumber: order.orderNumber,
    orderDate: formatDate(order.createdAt || new Date()),
    itemsList: itemsHtml,
    subtotal: formatCurrency(order.subtotal || order.totalAmount),
    shippingCost: formatCurrency(order.shippingCost || 0),
    tax: formatCurrency(order.tax || 0),
    discount: order.discount ? formatCurrency(order.discount) : formatCurrency(0),
    totalAmount: formatCurrency(order.totalAmount),
    paymentMethod: order.paymentMethod || 'Online Payment',
    paymentStatus: order.paymentStatus || 'Paid',
    billingName: order.billingAddress?.fullName || user.name,
    billingAddress: order.billingAddress?.addressLine1 || order.shippingAddress?.addressLine1 || '',
    billingCity: order.billingAddress?.city || order.shippingAddress?.city || '',
    billingState: order.billingAddress?.state || order.shippingAddress?.state || '',
    billingZip: order.billingAddress?.zipCode || order.shippingAddress?.zipCode || '',
    shippingName: order.shippingAddress?.fullName || user.name,
    shippingAddress: order.shippingAddress?.addressLine1 || '',
    shippingCity: order.shippingAddress?.city || '',
    shippingState: order.shippingAddress?.state || '',
    shippingZip: order.shippingAddress?.zipCode || '',
    currentYear: new Date().getFullYear()
  };
};

/**
 * Low Stock Alert Email Template Data
 * @param {object} product - Product data
 * @param {number} currentStock - Current stock level
 * @returns {object} - Template data
 */
export const getLowStockAlertData = (product, currentStock) => {
  return {
    productName: product.name,
    productSku: product.sku || 'N/A',
    currentStock: currentStock,
    threshold: product.lowStockThreshold || 10,
    productImage: product.images && product.images[0] ? product.images[0] : '',
    productUrl: `${process.env.ADMIN_CLIENT_URL || 'https://admin.stylehub.com'}/products/${product._id}`,
    inventoryUrl: `${process.env.ADMIN_CLIENT_URL || 'https://admin.stylehub.com'}/inventory`,
    currentYear: new Date().getFullYear()
  };
};

/**
 * Return Request Email Template Data
 * @param {object} returnRequest - Return request data
 * @param {object} order - Order data
 * @param {object} user - User data
 * @returns {object} - Template data
 */
export const getReturnRequestData = (returnRequest, order, user) => {
  return {
    userName: user.name || user.firstName || 'Valued Customer',
    returnNumber: returnRequest.returnNumber || returnRequest._id,
    orderNumber: order.orderNumber,
    requestDate: formatDate(returnRequest.createdAt || new Date()),
    reason: returnRequest.reason || 'Not specified',
    itemName: returnRequest.itemName || 'Order Item',
    quantity: returnRequest.quantity || 1,
    refundAmount: formatCurrency(returnRequest.refundAmount || order.totalAmount),
    status: returnRequest.status || 'Pending',
    instructions: returnRequest.instructions || 'Our team will review your request and get back to you within 24-48 hours.',
    returnUrl: `${process.env.CLIENT_URL || 'https://stylehub.com'}/returns/${returnRequest._id}`,
    supportUrl: `${process.env.CLIENT_URL || 'https://stylehub.com'}/support`,
    currentYear: new Date().getFullYear()
  };
};

/**
 * Render template by name
 * @param {string} templateName - Name of the template
 * @param {object} data - Template data
 * @returns {string} - Rendered HTML
 */
export const renderEmailTemplate = (templateName, data) => {
  return renderTemplate(templateName, data);
};

/**
 * Scheduled Report Email Template Data
 * @param {object} report - Report data
 * @param {Array} data - Report data
 * @param {string} previewHtml - HTML preview of report
 * @returns {object} - Template data
 */
export const getScheduledReportData = (report, data, previewHtml) => {
  return {
    reportName: report.name,
    reportType: report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1),
    reportDate: formatDate(new Date()),
    reportFrequency: report.schedule.frequency,
    recordCount: data.length,
    previewHtml: previewHtml,
    dashboardUrl: `${process.env.ADMIN_CLIENT_URL || 'https://admin.stylehub.com'}/reports`,
    currentYear: new Date().getFullYear()
  };
};

/**
 * Sales Report Email Template Data
 * @param {object} summary - Sales summary
 * @param {string} period - Report period
 * @returns {object} - Template data
 */
export const getSalesReportEmailData = (summary, period) => {
  return {
    reportTitle: `Sales Report - ${period}`,
    reportDate: formatDate(new Date()),
    totalOrders: summary.totalOrders || 0,
    totalRevenue: formatCurrency(summary.totalRevenue || 0),
    averageOrderValue: formatCurrency(summary.averageOrderValue || 0),
    completedOrders: summary.completedOrders || 0,
    cancelledOrders: summary.cancelledOrders || 0,
    dashboardUrl: `${process.env.ADMIN_CLIENT_URL || 'https://admin.stylehub.com'}/reports`,
    currentYear: new Date().getFullYear()
  };
};

/**
 * Inventory Alert Email Template Data
 * @param {Array} lowStockProducts - Low stock products
 * @param {Array} outOfStockProducts - Out of stock products
 * @returns {object} - Template data
 */
export const getInventoryAlertEmailData = (lowStockProducts, outOfStockProducts) => {
  const lowStockHtml = lowStockProducts.slice(0, 10).map(product => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${product.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${product.sku || 'N/A'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; color: #f39c12; font-weight: 600;">${product.stock}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(product.price)}</td>
    </tr>
  `).join('');

  const outOfStockHtml = outOfStockProducts.slice(0, 10).map(product => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${product.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${product.sku || 'N/A'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; color: #e74c3c; font-weight: 600;">0</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(product.price)}</td>
    </tr>
  `).join('');

  return {
    reportDate: formatDate(new Date()),
    lowStockCount: lowStockProducts.length,
    outOfStockCount: outOfStockProducts.length,
    lowStockList: lowStockHtml || '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #999;">No low stock items</td></tr>',
    outOfStockList: outOfStockHtml || '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #999;">No out of stock items</td></tr>',
    inventoryUrl: `${process.env.ADMIN_CLIENT_URL || 'https://admin.stylehub.com'}/inventory`,
    currentYear: new Date().getFullYear()
  };
};

/**
 * Revenue Report Email Template Data
 * @param {object} summary - Revenue summary
 * @param {Array} categoryData - Revenue by category
 * @param {string} period - Report period
 * @returns {object} - Template data
 */
export const getRevenueReportEmailData = (summary, categoryData, period) => {
  const categoriesHtml = categoryData.slice(0, 10).map((cat, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#f9f9f9' : '#fff'};">
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${cat.category || cat._id}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${formatCurrency(cat.revenue)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${cat.orderCount || cat.orders || 0}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${cat.itemsSold || 0}</td>
    </tr>
  `).join('');

  return {
    reportTitle: `Revenue Report - ${period}`,
    reportDate: formatDate(new Date()),
    totalRevenue: formatCurrency(summary.totalRevenue || 0),
    categoryBreakdown: categoriesHtml || '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #999;">No data available</td></tr>',
    dashboardUrl: `${process.env.ADMIN_CLIENT_URL || 'https://admin.stylehub.com'}/reports`,
    currentYear: new Date().getFullYear()
  };
};

export default {
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
  getScheduledReportData,
  getSalesReportEmailData,
  getInventoryAlertEmailData,
  getRevenueReportEmailData,
  renderEmailTemplate,
  formatCurrency,
  formatDate
};
