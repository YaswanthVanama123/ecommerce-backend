import Coupon from '../models/Coupon.js';
import Product from '../models/Product.js';

// @desc    Get all coupons (Admin)
// @route   GET /api/coupons
// @access  Private/Admin
export const getAllCoupons = async (req, res) => {
  try {
    const { search, status, type, sort } = req.query;
    const query = {};

    // Search by code or description
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status === 'active') {
      query.isActive = true;
      query.validTo = { $gte: new Date() };
    } else if (status === 'inactive') {
      query.isActive = false;
    } else if (status === 'expired') {
      query.validTo = { $lt: new Date() };
    }

    // Filter by type
    if (type && ['percentage', 'fixed'].includes(type)) {
      query.type = type;
    }

    // Determine sort order
    let sortOption = { createdAt: -1 };
    if (sort === 'code') {
      sortOption = { code: 1 };
    } else if (sort === 'validTo') {
      sortOption = { validTo: -1 };
    } else if (sort === 'usedCount') {
      sortOption = { usedCount: -1 };
    }

    const coupons = await Coupon.find(query)
      .populate('applicableCategories', 'name')
      .populate('applicableProducts', 'name')
      .sort(sortOption);

    res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching coupons',
      error: error.message
    });
  }
};

// @desc    Get single coupon by ID (Admin)
// @route   GET /api/coupons/:id
// @access  Private/Admin
export const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate('applicableCategories', 'name')
      .populate('applicableProducts', 'name');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      data: coupon
    });
  } catch (error) {
    console.error('Error fetching coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching coupon',
      error: error.message
    });
  }
};

// @desc    Create new coupon (Admin)
// @route   POST /api/coupons
// @access  Private/Admin
export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      type,
      value,
      minPurchase,
      maxDiscount,
      validFrom,
      validTo,
      usageLimit,
      isActive,
      applicableCategories,
      applicableProducts,
      description
    } = req.body;

    // Validation
    if (!code || !type || value === undefined || !validFrom || !validTo) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: code, type, value, validFrom, validTo'
      });
    }

    if (!['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be either "percentage" or "fixed"'
      });
    }

    if (value <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Value must be greater than 0'
      });
    }

    if (type === 'percentage' && value > 100) {
      return res.status(400).json({
        success: false,
        message: 'Percentage value cannot exceed 100'
      });
    }

    if (new Date(validFrom) >= new Date(validTo)) {
      return res.status(400).json({
        success: false,
        message: 'Valid from date must be before valid to date'
      });
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists'
      });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      type,
      value,
      minPurchase: minPurchase || 0,
      maxDiscount: maxDiscount || null,
      validFrom,
      validTo,
      usageLimit: usageLimit || null,
      isActive: isActive !== undefined ? isActive : true,
      applicableCategories: applicableCategories || [],
      applicableProducts: applicableProducts || [],
      description: description || ''
    });

    const populatedCoupon = await Coupon.findById(coupon._id)
      .populate('applicableCategories', 'name')
      .populate('applicableProducts', 'name');

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: populatedCoupon
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating coupon',
      error: error.message
    });
  }
};

// @desc    Update coupon (Admin)
// @route   PUT /api/coupons/:id
// @access  Private/Admin
export const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    const {
      code,
      type,
      value,
      minPurchase,
      maxDiscount,
      validFrom,
      validTo,
      usageLimit,
      isActive,
      applicableCategories,
      applicableProducts,
      description
    } = req.body;

    // Check if updating code and it already exists
    if (code && code.toUpperCase() !== coupon.code) {
      const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code already exists'
        });
      }
      coupon.code = code.toUpperCase();
    }

    // Validate type
    if (type && !['percentage', 'fixed'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be either "percentage" or "fixed"'
      });
    }

    // Validate value
    if (value !== undefined) {
      if (value <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Value must be greater than 0'
        });
      }
      if ((type || coupon.type) === 'percentage' && value > 100) {
        return res.status(400).json({
          success: false,
          message: 'Percentage value cannot exceed 100'
        });
      }
      coupon.value = value;
    }

    // Validate dates
    if (validFrom || validTo) {
      const fromDate = validFrom ? new Date(validFrom) : coupon.validFrom;
      const toDate = validTo ? new Date(validTo) : coupon.validTo;
      if (fromDate >= toDate) {
        return res.status(400).json({
          success: false,
          message: 'Valid from date must be before valid to date'
        });
      }
    }

    // Update fields
    if (type) coupon.type = type;
    if (minPurchase !== undefined) coupon.minPurchase = minPurchase;
    if (maxDiscount !== undefined) coupon.maxDiscount = maxDiscount;
    if (validFrom) coupon.validFrom = validFrom;
    if (validTo) coupon.validTo = validTo;
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
    if (isActive !== undefined) coupon.isActive = isActive;
    if (applicableCategories !== undefined) coupon.applicableCategories = applicableCategories;
    if (applicableProducts !== undefined) coupon.applicableProducts = applicableProducts;
    if (description !== undefined) coupon.description = description;

    await coupon.save();

    const updatedCoupon = await Coupon.findById(coupon._id)
      .populate('applicableCategories', 'name')
      .populate('applicableProducts', 'name');

    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      data: updatedCoupon
    });
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating coupon',
      error: error.message
    });
  }
};

// @desc    Delete coupon (Admin)
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    await coupon.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting coupon',
      error: error.message
    });
  }
};

// @desc    Toggle coupon active status (Admin)
// @route   PATCH /api/coupons/:id/toggle
// @access  Private/Admin
export const toggleCouponStatus = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.status(200).json({
      success: true,
      message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'} successfully`,
      data: coupon
    });
  } catch (error) {
    console.error('Error toggling coupon status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling coupon status',
      error: error.message
    });
  }
};

// @desc    Get coupon statistics (Admin)
// @route   GET /api/coupons/stats/overview
// @access  Private/Admin
export const getCouponStatistics = async (req, res) => {
  try {
    const now = new Date();

    const totalCoupons = await Coupon.countDocuments();
    const activeCoupons = await Coupon.countDocuments({
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now }
    });
    const expiredCoupons = await Coupon.countDocuments({
      validTo: { $lt: now }
    });
    const inactiveCoupons = await Coupon.countDocuments({ isActive: false });

    // Get most used coupons
    const mostUsedCoupons = await Coupon.find()
      .sort({ usedCount: -1 })
      .limit(5)
      .select('code usedCount type value');

    // Calculate total usage
    const usageStats = await Coupon.aggregate([
      {
        $group: {
          _id: null,
          totalUsage: { $sum: '$usedCount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalCoupons,
        activeCoupons,
        expiredCoupons,
        inactiveCoupons,
        totalUsage: usageStats.length > 0 ? usageStats[0].totalUsage : 0,
        mostUsedCoupons
      }
    });
  } catch (error) {
    console.error('Error fetching coupon statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching statistics',
      error: error.message
    });
  }
};

// @desc    Validate coupon (User)
// @route   POST /api/coupons/validate
// @access  Private/User
export const validateCoupon = async (req, res) => {
  try {
    const { code, orderTotal, productIds, categoryIds } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Please provide coupon code'
      });
    }

    if (!orderTotal || orderTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid order total'
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }

    // Validate coupon for the order
    const validation = coupon.validateForOrder(orderTotal, productIds || [], categoryIds || []);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors[0] || 'Coupon is not valid',
        errors: validation.errors
      });
    }

    // Calculate discount
    const discount = coupon.calculateDiscount(orderTotal);
    const finalTotal = orderTotal - discount;

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      data: {
        coupon: {
          id: coupon._id,
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          description: coupon.description
        },
        discount,
        finalTotal: Math.max(0, finalTotal)
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while validating coupon',
      error: error.message
    });
  }
};

// @desc    Apply coupon to order (User)
// @route   POST /api/coupons/apply
// @access  Private/User
export const applyCoupon = async (req, res) => {
  try {
    const { code, orderTotal, productIds, categoryIds } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Please provide coupon code'
      });
    }

    if (!orderTotal || orderTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid order total'
      });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Invalid coupon code'
      });
    }

    // Validate coupon for the order
    const validation = coupon.validateForOrder(orderTotal, productIds || [], categoryIds || []);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors[0] || 'Coupon is not valid',
        errors: validation.errors
      });
    }

    // Calculate discount
    const discount = coupon.calculateDiscount(orderTotal);
    const finalTotal = orderTotal - discount;

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      data: {
        couponId: coupon._id,
        code: coupon.code,
        discount,
        originalTotal: orderTotal,
        finalTotal: Math.max(0, finalTotal)
      }
    });
  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while applying coupon',
      error: error.message
    });
  }
};
