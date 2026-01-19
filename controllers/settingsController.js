import Settings from '../models/Settings.js';
import nodemailer from 'nodemailer';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Get all system settings
 * @route   GET /api/superadmin/settings
 * @access  Private/Superadmin
 */
export const getSystemSettings = async (req, res) => {
  try {
    const settings = await Settings.getInstance();

    return res.status(200).json({
      success: true,
      data: settings,
      general: settings.general || {},
      email: settings.email || {},
      payment: settings.payment || {},
      shipping: settings.shipping || {},
      security: settings.security || {},
      appearance: settings.appearance || {}
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching system settings',
      error: error.message
    });
  }
};

/**
 * Update general settings
 * @route   PUT /api/superadmin/settings/general
 * @access  Private/Superadmin
 */
export const updateGeneralSettings = async (req, res) => {
  try {
    const settings = await Settings.getInstance();

    settings.general = {
      ...settings.general,
      ...req.body
    };
    settings.updatedBy = req.user._id;

    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'General settings updated successfully',
      general: settings.general
    });
  } catch (error) {
    console.error('Error updating general settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating general settings',
      error: error.message
    });
  }
};

/**
 * Update email settings
 * @route   PUT /api/superadmin/settings/email
 * @access  Private/Superadmin
 */
export const updateEmailSettings = async (req, res) => {
  try {
    const settings = await Settings.getInstance();

    settings.email = {
      ...settings.email,
      ...req.body
    };
    settings.updatedBy = req.user._id;

    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Email settings updated successfully',
      email: settings.email
    });
  } catch (error) {
    console.error('Error updating email settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating email settings',
      error: error.message
    });
  }
};

/**
 * Test email connection
 * @route   POST /api/superadmin/settings/email/test
 * @access  Private/Superadmin
 */
export const testEmailConnection = async (req, res) => {
  try {
    const settings = await Settings.getInstance();

    if (!settings.email || !settings.email.smtpHost || !settings.email.smtpUser) {
      return res.status(400).json({
        success: false,
        message: 'Email settings not configured. Please configure SMTP settings first.'
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: settings.email.smtpHost,
      port: settings.email.smtpPort,
      secure: settings.email.smtpSecure,
      auth: {
        user: settings.email.smtpUser,
        pass: settings.email.smtpPassword
      }
    });

    // Verify connection
    await transporter.verify();

    // Send test email
    await transporter.sendMail({
      from: `"${settings.email.fromName}" <${settings.email.fromEmail}>`,
      to: req.user.email,
      subject: 'Test Email - SMTP Configuration Successful',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">Email Configuration Test Successful!</h2>
          <p>Your SMTP email settings have been configured correctly.</p>
          <p>This is a test email sent from your e-commerce application.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            Sent from ${settings.general?.siteName || 'E-Commerce Store'}<br>
            ${new Date().toLocaleString()}
          </p>
        </div>
      `
    });

    return res.status(200).json({
      success: true,
      message: 'Test email sent successfully! Please check your inbox.'
    });
  } catch (error) {
    console.error('Error testing email connection:', error);
    return res.status(500).json({
      success: false,
      message: 'Email connection test failed',
      error: error.message
    });
  }
};

/**
 * Update payment settings
 * @route   PUT /api/superadmin/settings/payment
 * @access  Private/Superadmin
 */
export const updatePaymentSettings = async (req, res) => {
  try {
    const settings = await Settings.getInstance();

    settings.payment = {
      ...settings.payment,
      ...req.body
    };
    settings.updatedBy = req.user._id;

    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Payment settings updated successfully',
      payment: settings.payment
    });
  } catch (error) {
    console.error('Error updating payment settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating payment settings',
      error: error.message
    });
  }
};

/**
 * Update shipping settings
 * @route   PUT /api/superadmin/settings/shipping
 * @access  Private/Superadmin
 */
export const updateShippingSettings = async (req, res) => {
  try {
    const settings = await Settings.getInstance();

    settings.shipping = {
      ...settings.shipping,
      ...req.body
    };
    settings.updatedBy = req.user._id;

    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Shipping settings updated successfully',
      shipping: settings.shipping
    });
  } catch (error) {
    console.error('Error updating shipping settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating shipping settings',
      error: error.message
    });
  }
};

/**
 * Update security settings
 * @route   PUT /api/superadmin/settings/security
 * @access  Private/Superadmin
 */
export const updateSecuritySettings = async (req, res) => {
  try {
    const settings = await Settings.getInstance();

    settings.security = {
      ...settings.security,
      ...req.body
    };
    settings.updatedBy = req.user._id;

    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Security settings updated successfully',
      security: settings.security
    });
  } catch (error) {
    console.error('Error updating security settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating security settings',
      error: error.message
    });
  }
};

/**
 * Update appearance settings
 * @route   PUT /api/superadmin/settings/appearance
 * @access  Private/Superadmin
 */
export const updateAppearanceSettings = async (req, res) => {
  try {
    const settings = await Settings.getInstance();

    settings.appearance = {
      ...settings.appearance,
      ...req.body
    };
    settings.updatedBy = req.user._id;

    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Appearance settings updated successfully',
      appearance: settings.appearance
    });
  } catch (error) {
    console.error('Error updating appearance settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating appearance settings',
      error: error.message
    });
  }
};

/**
 * Upload logo
 * @route   POST /api/superadmin/settings/upload-logo
 * @access  Private/Superadmin
 */
export const uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    const settings = await Settings.getInstance();

    // Generate file URL (assuming files are served from /uploads)
    const logoUrl = `/uploads/logos/${req.file.filename}`;

    // Delete old logo file if exists
    if (settings.appearance?.logoUrl) {
      const oldLogoPath = path.join(process.cwd(), 'uploads', 'logos', path.basename(settings.appearance.logoUrl));
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    // Update settings
    settings.appearance = {
      ...settings.appearance,
      logoUrl
    };
    settings.updatedBy = req.user._id;

    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Logo uploaded successfully',
      logoUrl
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error uploading logo',
      error: error.message
    });
  }
};
