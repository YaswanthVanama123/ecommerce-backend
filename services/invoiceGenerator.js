import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import Settings from '../models/Settings.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Indian state codes for GST validation
const INDIAN_STATES = {
  'Andhra Pradesh': '37',
  'Arunachal Pradesh': '12',
  'Assam': '18',
  'Bihar': '10',
  'Chhattisgarh': '22',
  'Goa': '30',
  'Gujarat': '24',
  'Haryana': '06',
  'Himachal Pradesh': '02',
  'Jharkhand': '20',
  'Karnataka': '29',
  'Kerala': '32',
  'Madhya Pradesh': '23',
  'Maharashtra': '27',
  'Manipur': '14',
  'Meghalaya': '17',
  'Mizoram': '15',
  'Nagaland': '13',
  'Odisha': '21',
  'Punjab': '03',
  'Rajasthan': '08',
  'Sikkim': '11',
  'Tamil Nadu': '33',
  'Telangana': '36',
  'Tripura': '16',
  'Uttar Pradesh': '09',
  'Uttarakhand': '05',
  'West Bengal': '19',
  'Delhi': '07',
  'Jammu and Kashmir': '01',
  'Ladakh': '38',
  'Puducherry': '34',
  'Chandigarh': '04',
  'Dadra and Nagar Haveli and Daman and Diu': '26',
  'Lakshadweep': '31',
  'Andaman and Nicobar Islands': '35'
};

/**
 * Validate GST number format
 */
export const validateGSTNumber = (gstNumber) => {
  if (!gstNumber) return false;

  // GST format: 22AAAAA0000A1Z5
  // 2 digits state code + 10 chars PAN + 1 entity number + 1 Z + 1 checksum
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gstNumber);
};

/**
 * Determine if transaction is interstate or intrastate
 */
export const isInterstateSale = (companyState, customerState) => {
  const companyStateCode = INDIAN_STATES[companyState];
  const customerStateCode = INDIAN_STATES[customerState];

  return companyStateCode !== customerStateCode;
};

/**
 * Calculate GST components
 */
export const calculateGSTComponents = (itemsTotal, gstRate, isInterstate) => {
  const gstAmount = (itemsTotal * gstRate) / 100;

  if (isInterstate) {
    return {
      igst: gstAmount,
      cgst: 0,
      sgst: 0
    };
  } else {
    return {
      igst: 0,
      cgst: gstAmount / 2,
      sgst: gstAmount / 2
    };
  }
};

/**
 * Generate invoice number
 */
export const generateInvoiceNumber = async () => {
  const count = await Order.countDocuments({ 'invoice.invoiceNumber': { $exists: true } });
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  return `INV/${year}/${month}/${String(count + 1).padStart(6, '0')}`;
};

/**
 * Generate QR code for invoice verification
 */
const generateQRCode = async (data) => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 150,
      margin: 1
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error('QR Code generation error:', error);
    return null;
  }
};

/**
 * Generate invoice PDF
 */
export const generateInvoicePDF = async (orderId) => {
  try {
    // Fetch order with populated data
    const order = await Order.findById(orderId)
      .populate('user', 'name email phone')
      .populate('items.product', 'hsnCode');

    if (!order) {
      throw new Error('Order not found');
    }

    // Get company settings
    const settings = await Settings.getInstance();

    // Generate invoice number if not exists
    if (!order.invoice || !order.invoice.invoiceNumber) {
      const invoiceNumber = await generateInvoiceNumber();
      order.invoice = {
        invoiceNumber,
        generatedAt: new Date(),
        path: `invoices/${order.orderNumber}.pdf`
      };
      await order.save();
    }

    // Determine if interstate or intrastate
    const companyState = settings.company?.state || 'Maharashtra';
    const customerState = order.shippingAddress.state;
    const interstate = isInterstateSale(companyState, customerState);

    // Calculate GST components
    const gstRate = settings.tax?.gstRate || 18;
    const gstComponents = calculateGSTComponents(
      order.itemsTotal - order.discount,
      gstRate,
      interstate
    );

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Invoice ${order.invoice.invoiceNumber}`,
        Author: settings.general?.siteName || 'E-Commerce Store',
        Subject: `Tax Invoice for Order ${order.orderNumber}`,
        Keywords: 'invoice, tax, GST'
      }
    });

    // Create write stream
    const invoicePath = path.join(__dirname, '..', 'invoices', `${order.orderNumber}.pdf`);
    const writeStream = fs.createWriteStream(invoicePath);
    doc.pipe(writeStream);

    // Generate QR code for verification
    const qrData = JSON.stringify({
      invoiceNumber: order.invoice.invoiceNumber,
      orderNumber: order.orderNumber,
      amount: order.totalAmount,
      date: order.invoice.generatedAt
    });
    const qrCodeImage = await generateQRCode(qrData);

    // Header section
    drawHeader(doc, settings, order);

    // Company and customer details
    drawCompanyAndCustomerDetails(doc, settings, order);

    // Invoice details
    drawInvoiceDetails(doc, order);

    // Items table
    await drawItemsTable(doc, order, gstRate);

    // Tax breakdown
    drawTaxBreakdown(doc, order, gstComponents, interstate, gstRate);

    // Payment details
    drawPaymentDetails(doc, order);

    // Terms and conditions
    drawTermsAndConditions(doc, settings);

    // QR code and signature
    drawQRCodeAndSignature(doc, qrCodeImage, settings);

    // Footer
    drawFooter(doc, settings, order);

    // Finalize PDF
    doc.end();

    // Wait for write stream to finish
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    return {
      success: true,
      invoiceNumber: order.invoice.invoiceNumber,
      path: invoicePath
    };

  } catch (error) {
    console.error('Invoice generation error:', error);
    throw new Error(`Failed to generate invoice: ${error.message}`);
  }
};

/**
 * Draw header with company logo and title
 */
const drawHeader = (doc, settings, order) => {
  const pageWidth = doc.page.width;

  // Add logo if available
  if (settings.appearance?.logoUrl && fs.existsSync(settings.appearance.logoUrl)) {
    try {
      doc.image(settings.appearance.logoUrl, 50, 45, { width: 80 });
    } catch (error) {
      console.error('Logo loading error:', error);
    }
  }

  // Tax Invoice title
  doc.fontSize(24)
     .fillColor('#2563eb')
     .text('TAX INVOICE', 200, 60, { align: 'center' });

  // Original/Duplicate marker
  doc.fontSize(10)
     .fillColor('#666')
     .text('ORIGINAL FOR RECIPIENT', 200, 90, { align: 'center' });

  doc.moveDown(2);
};

/**
 * Draw company and customer details
 */
const drawCompanyAndCustomerDetails = (doc, settings, order) => {
  const leftColumn = 50;
  const rightColumn = 320;
  let yPosition = 130;

  // Company details box
  doc.fontSize(10)
     .fillColor('#000')
     .font('Helvetica-Bold')
     .text('SOLD BY:', leftColumn, yPosition);

  yPosition += 15;
  doc.font('Helvetica')
     .fontSize(11)
     .text(settings.company?.name || settings.general?.siteName || 'Your Company Name', leftColumn, yPosition);

  yPosition += 15;
  doc.fontSize(9)
     .fillColor('#444')
     .text(settings.company?.address || settings.general?.address || 'Company Address', leftColumn, yPosition, { width: 240 });

  yPosition += 30;
  if (settings.company?.gstNumber) {
    doc.text(`GST: ${settings.company.gstNumber}`, leftColumn, yPosition);
    yPosition += 15;
  }
  if (settings.company?.pan) {
    doc.text(`PAN: ${settings.company.pan}`, leftColumn, yPosition);
    yPosition += 15;
  }
  if (settings.general?.contactEmail) {
    doc.text(`Email: ${settings.general.contactEmail}`, leftColumn, yPosition);
    yPosition += 15;
  }
  if (settings.general?.phoneNumber) {
    doc.text(`Phone: ${settings.general.phoneNumber}`, leftColumn, yPosition);
  }

  // Customer details box
  yPosition = 130;
  doc.font('Helvetica-Bold')
     .fontSize(10)
     .fillColor('#000')
     .text('BILLING & SHIPPING ADDRESS:', rightColumn, yPosition);

  yPosition += 15;
  doc.font('Helvetica')
     .fontSize(11)
     .text(order.shippingAddress.fullName, rightColumn, yPosition);

  yPosition += 15;
  doc.fontSize(9)
     .fillColor('#444');

  const addressLines = [
    order.shippingAddress.addressLine1,
    order.shippingAddress.addressLine2,
    `${order.shippingAddress.city}, ${order.shippingAddress.state}`,
    `${order.shippingAddress.zipCode}, ${order.shippingAddress.country}`
  ].filter(Boolean);

  addressLines.forEach(line => {
    doc.text(line, rightColumn, yPosition, { width: 230 });
    yPosition += 15;
  });

  doc.text(`Phone: ${order.shippingAddress.phone}`, rightColumn, yPosition);
  yPosition += 15;

  if (order.user?.email) {
    doc.text(`Email: ${order.user.email}`, rightColumn, yPosition);
  }

  // Draw separator line
  doc.moveTo(50, 310)
     .lineTo(545, 310)
     .stroke('#ddd');
};

/**
 * Draw invoice details
 */
const drawInvoiceDetails = (doc, order) => {
  const yPosition = 325;

  doc.fontSize(9)
     .fillColor('#444')
     .font('Helvetica');

  // Left side - Invoice details
  doc.text(`Invoice Number: ${order.invoice.invoiceNumber}`, 50, yPosition);
  doc.text(`Invoice Date: ${new Date(order.invoice.generatedAt).toLocaleDateString('en-IN')}`, 50, yPosition + 15);
  doc.text(`Order Number: ${order.orderNumber}`, 50, yPosition + 30);
  doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 50, yPosition + 45);

  // Right side - Payment details
  doc.text(`Payment Method: ${order.paymentMethod}`, 320, yPosition);
  doc.text(`Payment Status: ${order.paymentStatus.toUpperCase()}`, 320, yPosition + 15);
  if (order.paymentDetails?.transactionId) {
    doc.text(`Transaction ID: ${order.paymentDetails.transactionId}`, 320, yPosition + 30);
  }

  // Draw separator line
  doc.moveTo(50, 390)
     .lineTo(545, 390)
     .stroke('#ddd');
};

/**
 * Draw items table
 */
const drawItemsTable = async (doc, order, gstRate) => {
  let yPosition = 405;

  // Table header
  doc.fillColor('#2563eb')
     .rect(50, yPosition, 495, 25)
     .fill();

  doc.fillColor('#fff')
     .fontSize(9)
     .font('Helvetica-Bold');

  doc.text('Item', 60, yPosition + 8);
  doc.text('HSN', 270, yPosition + 8);
  doc.text('Qty', 320, yPosition + 8);
  doc.text('Price', 370, yPosition + 8);
  doc.text('Discount', 430, yPosition + 8);
  doc.text('Amount', 495, yPosition + 8);

  yPosition += 25;

  // Table rows
  doc.fillColor('#000')
     .font('Helvetica');

  for (const item of order.items) {
    // Fetch HSN code from product
    const product = item.product?.hsnCode ? item.product :
                    await Product.findById(item.product).select('hsnCode');

    const hsnCode = product?.hsnCode || 'N/A';
    const price = item.price;
    const discountPrice = item.discountPrice || item.price;
    const discount = price - discountPrice;
    const amount = discountPrice * item.quantity;

    // Check if we need a new page
    if (yPosition > 700) {
      doc.addPage();
      yPosition = 50;
    }

    // Draw row background (alternating)
    if (order.items.indexOf(item) % 2 === 1) {
      doc.fillColor('#f9fafb')
         .rect(50, yPosition, 495, 20)
         .fill();
    }

    doc.fillColor('#000')
       .fontSize(8);

    // Item name (wrap if too long)
    const itemName = item.name.length > 35 ? item.name.substring(0, 32) + '...' : item.name;
    doc.text(itemName, 60, yPosition + 5, { width: 200 });

    // HSN code
    doc.text(hsnCode, 270, yPosition + 5);

    // Quantity
    doc.text(item.quantity.toString(), 320, yPosition + 5);

    // Price
    doc.text(`₹${price.toFixed(2)}`, 370, yPosition + 5);

    // Discount
    doc.text(`₹${discount.toFixed(2)}`, 430, yPosition + 5);

    // Amount
    doc.text(`₹${amount.toFixed(2)}`, 495, yPosition + 5);

    yPosition += 20;
  }

  // Draw table border
  doc.strokeColor('#ddd')
     .rect(50, 405, 495, yPosition - 405)
     .stroke();

  return yPosition;
};

/**
 * Draw tax breakdown
 */
const drawTaxBreakdown = (doc, order, gstComponents, interstate, gstRate) => {
  let yPosition = doc.y + 20;

  const subtotal = order.itemsTotal;
  const discount = order.discount;
  const shippingCharge = order.shippingCharge || 0;
  const taxableAmount = subtotal - discount;
  const totalAmount = order.totalAmount;

  // Right aligned summary
  const labelX = 380;
  const valueX = 495;

  doc.fontSize(9)
     .fillColor('#444')
     .font('Helvetica');

  doc.text('Subtotal:', labelX, yPosition, { width: 100, align: 'right' });
  doc.text(`₹${subtotal.toFixed(2)}`, valueX, yPosition, { width: 50, align: 'right' });
  yPosition += 15;

  if (discount > 0) {
    doc.text('Discount:', labelX, yPosition, { width: 100, align: 'right' });
    doc.fillColor('#16a34a')
       .text(`-₹${discount.toFixed(2)}`, valueX, yPosition, { width: 50, align: 'right' });
    doc.fillColor('#444');
    yPosition += 15;
  }

  doc.text('Taxable Amount:', labelX, yPosition, { width: 100, align: 'right' });
  doc.text(`₹${taxableAmount.toFixed(2)}`, valueX, yPosition, { width: 50, align: 'right' });
  yPosition += 15;

  // GST breakdown
  if (interstate) {
    doc.text(`IGST (${gstRate}%):`, labelX, yPosition, { width: 100, align: 'right' });
    doc.text(`₹${gstComponents.igst.toFixed(2)}`, valueX, yPosition, { width: 50, align: 'right' });
    yPosition += 15;
  } else {
    doc.text(`CGST (${gstRate/2}%):`, labelX, yPosition, { width: 100, align: 'right' });
    doc.text(`₹${gstComponents.cgst.toFixed(2)}`, valueX, yPosition, { width: 50, align: 'right' });
    yPosition += 15;

    doc.text(`SGST (${gstRate/2}%):`, labelX, yPosition, { width: 100, align: 'right' });
    doc.text(`₹${gstComponents.sgst.toFixed(2)}`, valueX, yPosition, { width: 50, align: 'right' });
    yPosition += 15;
  }

  if (shippingCharge > 0) {
    doc.text('Shipping:', labelX, yPosition, { width: 100, align: 'right' });
    doc.text(`₹${shippingCharge.toFixed(2)}`, valueX, yPosition, { width: 50, align: 'right' });
    yPosition += 15;
  }

  // Total
  doc.fontSize(11)
     .font('Helvetica-Bold')
     .fillColor('#000');

  doc.text('Total Amount:', labelX, yPosition, { width: 100, align: 'right' });
  doc.text(`₹${totalAmount.toFixed(2)}`, valueX, yPosition, { width: 50, align: 'right' });

  // Draw box around total
  doc.strokeColor('#2563eb')
     .lineWidth(1)
     .rect(375, yPosition - 5, 170, 20)
     .stroke();
};

/**
 * Draw payment details
 */
const drawPaymentDetails = (doc, order) => {
  const yPosition = doc.y + 30;

  doc.fontSize(9)
     .fillColor('#444')
     .font('Helvetica-Bold')
     .text('Payment Details:', 50, yPosition);

  doc.font('Helvetica')
     .text(`Payment Method: ${order.paymentMethod}`, 50, yPosition + 15);
  doc.text(`Payment Status: ${order.paymentStatus.toUpperCase()}`, 50, yPosition + 30);

  if (order.paymentDetails?.transactionId) {
    doc.text(`Transaction ID: ${order.paymentDetails.transactionId}`, 50, yPosition + 45);
  }

  if (order.paymentDetails?.paidAt) {
    doc.text(`Paid On: ${new Date(order.paymentDetails.paidAt).toLocaleDateString('en-IN')}`, 50, yPosition + 60);
  }
};

/**
 * Draw terms and conditions
 */
const drawTermsAndConditions = (doc, settings) => {
  const yPosition = doc.y + 30;

  // Check if we need a new page
  if (yPosition > 650) {
    doc.addPage();
  }

  doc.fontSize(9)
     .fillColor('#000')
     .font('Helvetica-Bold')
     .text('Terms & Conditions:', 50, yPosition > 650 ? 50 : yPosition);

  const terms = settings.company?.invoiceTerms || [
    'Goods once sold will not be taken back or exchanged',
    'All disputes are subject to jurisdiction only',
    'Warranty as per manufacturer terms',
    'Please check all items at the time of delivery'
  ];

  doc.fontSize(8)
     .fillColor('#444')
     .font('Helvetica');

  let termYPosition = (yPosition > 650 ? 50 : yPosition) + 15;
  terms.forEach((term, index) => {
    doc.text(`${index + 1}. ${term}`, 50, termYPosition, { width: 400 });
    termYPosition += 12;
  });
};

/**
 * Draw QR code and digital signature
 */
const drawQRCodeAndSignature = (doc, qrCodeImage, settings) => {
  const yPosition = doc.page.height - 150;

  // QR Code
  if (qrCodeImage) {
    try {
      doc.image(qrCodeImage, 50, yPosition, { width: 80 });
      doc.fontSize(7)
         .fillColor('#666')
         .text('Scan to verify', 50, yPosition + 85, { width: 80, align: 'center' });
    } catch (error) {
      console.error('QR code rendering error:', error);
    }
  }

  // Digital signature
  doc.fontSize(9)
     .fillColor('#000')
     .font('Helvetica-Bold')
     .text('For ' + (settings.company?.name || settings.general?.siteName || 'Company'), 400, yPosition, { align: 'right' });

  doc.fontSize(8)
     .fillColor('#444')
     .font('Helvetica')
     .text('Authorized Signatory', 400, yPosition + 60, { align: 'right' });
};

/**
 * Draw footer
 */
const drawFooter = (doc, settings, order) => {
  const footerY = doc.page.height - 50;

  doc.fontSize(7)
     .fillColor('#666')
     .text(
       `This is a computer-generated invoice and does not require a physical signature | Generated on ${new Date().toLocaleString('en-IN')}`,
       50,
       footerY,
       { align: 'center', width: 495 }
     );

  doc.fontSize(7)
     .text(
       settings.company?.returnPolicy || 'Thank you for your business!',
       50,
       footerY + 15,
       { align: 'center', width: 495 }
     );
};

/**
 * Auto-generate invoice when order is delivered
 */
export const autoGenerateInvoice = async (orderId) => {
  try {
    const order = await Order.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    // Only generate if order is delivered and invoice doesn't exist
    if (order.orderStatus === 'delivered' && (!order.invoice || !order.invoice.invoiceNumber)) {
      await generateInvoicePDF(orderId);
      console.log(`Invoice auto-generated for order ${order.orderNumber}`);
    }
  } catch (error) {
    console.error('Auto invoice generation error:', error);
  }
};

export default {
  generateInvoicePDF,
  autoGenerateInvoice,
  validateGSTNumber,
  isInterstateSale,
  calculateGSTComponents,
  generateInvoiceNumber
};
