import Pincode from '../models/Pincode.js';
import Product from '../models/Product.js';

/**
 * Check if a pincode is serviceable
 * @route   POST /api/pincode/check
 * @access  Public
 */
export const checkPincodeServiceability = async (req, res) => {
  try {
    const { pincode } = req.body;

    if (!pincode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a pincode',
      });
    }

    // Validate pincode format (6 digits for India)
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    if (!pincodeRegex.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit pincode',
      });
    }

    const result = await Pincode.checkServiceability(pincode);

    if (!result.serviceable) {
      return res.status(200).json({
        success: false,
        serviceable: false,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      serviceable: true,
      data: {
        pincode: result.data.pincode,
        city: result.data.city,
        district: result.data.district,
        state: result.data.state,
        deliveryZone: result.data.deliveryZone,
        estimatedDelivery: result.estimatedDelivery,
        codAvailable: result.data.codAvailable,
      },
    });
  } catch (error) {
    console.error('Error checking pincode serviceability:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking pincode serviceability',
      error: error.message,
    });
  }
};

/**
 * Check if a specific product can be delivered to a pincode
 * @route   POST /api/pincode/check-product
 * @access  Public
 */
export const checkProductDeliverability = async (req, res) => {
  try {
    const { pincode, productId } = req.body;

    if (!pincode || !productId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both pincode and product ID',
      });
    }

    // Validate pincode format
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    if (!pincodeRegex.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit pincode',
      });
    }

    // Get pincode data
    const pincodeData = await Pincode.findOne({
      pincode,
      isActive: true,
    });

    if (!pincodeData) {
      return res.status(200).json({
        success: false,
        deliverable: false,
        message: 'Sorry, we do not deliver to this pincode yet',
      });
    }

    // Get product data
    const product = await Product.findById(productId).populate('category');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if product can be delivered
    const deliveryCheck = pincodeData.canDeliverProduct(product);

    if (!deliveryCheck.deliverable) {
      return res.status(200).json({
        success: false,
        deliverable: false,
        message: deliveryCheck.reason,
      });
    }

    return res.status(200).json({
      success: true,
      deliverable: true,
      data: {
        pincode: pincodeData.pincode,
        city: pincodeData.city,
        state: pincodeData.state,
        estimatedDelivery: deliveryCheck.estimatedDelivery,
        codAvailable: deliveryCheck.codAvailable,
        deliveryZone: deliveryCheck.deliveryZone,
        product: {
          id: product._id,
          name: product.name,
          category: product.category?.name,
        },
      },
    });
  } catch (error) {
    console.error('Error checking product deliverability:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking product deliverability',
      error: error.message,
    });
  }
};

/**
 * Get all serviceable pincodes (Superadmin only)
 * @route   GET /api/superadmin/pincodes
 * @access  Private/Superadmin
 */
export const getAllPincodes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      isServiceable,
      deliveryZone,
      state,
    } = req.query;

    const query = {};

    // Search by pincode, city, district, or state
    if (search) {
      query.$or = [
        { pincode: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { district: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by serviceability (only if explicitly set to 'true' or 'false')
    if (isServiceable !== undefined && isServiceable !== '') {
      query.isServiceable = isServiceable === 'true';
    }

    // Filter by delivery zone (only if not empty)
    if (deliveryZone && deliveryZone !== '') {
      query.deliveryZone = deliveryZone;
    }

    // Filter by state
    if (state) {
      query.state = state;
    }

    const pincodes = await Pincode.find(query)
      .sort({ pincode: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('restrictedCategories', 'name')
      .lean({ virtuals: true }); // Convert to plain objects and include virtuals

    const count = await Pincode.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: {
        pincodes,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalPincodes: count,
          hasMore: page * limit < count,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching pincodes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching pincodes',
      error: error.message,
    });
  }
};

/**
 * Add new pincode (Superadmin only)
 * @route   POST /api/superadmin/pincodes
 * @access  Private/Superadmin
 */
export const addPincode = async (req, res) => {
  try {
    const { deliveryDays, ...restData } = req.body;

    // Check if pincode already exists
    const existingPincode = await Pincode.findOne({
      pincode: restData.pincode,
    });

    if (existingPincode) {
      return res.status(400).json({
        success: false,
        message: 'This pincode already exists',
      });
    }

    // Map deliveryDays to estimatedDeliveryDays structure
    const pincodeData = {
      ...restData,
      estimatedDeliveryDays: {
        min: deliveryDays || 2,
        max: (deliveryDays || 2) + 2,
      },
    };

    const pincode = await Pincode.create(pincodeData);

    return res.status(201).json({
      success: true,
      message: 'Pincode added successfully',
      data: pincode,
    });
  } catch (error) {
    console.error('Error adding pincode:', error);
    return res.status(500).json({
      success: false,
      message: 'Error adding pincode',
      error: error.message,
    });
  }
};

/**
 * Update pincode (Superadmin only)
 * @route   PUT /api/superadmin/pincodes/:id
 * @access  Private/Superadmin
 */
export const updatePincode = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryDays, ...restData } = req.body;

    // Map deliveryDays to estimatedDeliveryDays structure
    const updates = {
      ...restData,
    };

    if (deliveryDays !== undefined) {
      updates.estimatedDeliveryDays = {
        min: deliveryDays,
        max: deliveryDays + 2,
      };
    }

    const pincode = await Pincode.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!pincode) {
      return res.status(404).json({
        success: false,
        message: 'Pincode not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Pincode updated successfully',
      data: pincode,
    });
  } catch (error) {
    console.error('Error updating pincode:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating pincode',
      error: error.message,
    });
  }
};

/**
 * Delete pincode (Superadmin only)
 * @route   DELETE /api/superadmin/pincodes/:id
 * @access  Private/Superadmin
 */
export const deletePincode = async (req, res) => {
  try {
    const { id } = req.params;

    const pincode = await Pincode.findByIdAndDelete(id);

    if (!pincode) {
      return res.status(404).json({
        success: false,
        message: 'Pincode not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Pincode deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting pincode:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting pincode',
      error: error.message,
    });
  }
};

/**
 * Bulk upload pincodes from CSV (Superadmin only)
 * @route   POST /api/superadmin/pincodes/bulk-upload
 * @access  Private/Superadmin
 */
export const bulkUploadPincodes = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a CSV file',
      });
    }

    // Parse CSV file content
    const fileContent = req.file.buffer.toString('utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is empty or invalid',
      });
    }

    // Skip header row and parse data rows
    const dataRows = lines.slice(1);

    const results = {
      success: [],
      failed: [],
      duplicate: [],
    };

    for (const row of dataRows) {
      try {
        const [pincode, city, district, state, deliveryZone, deliveryDays, isServiceable, codAvailable] = row.split(',').map(val => val.trim());

        if (!pincode || !city || !district || !state) {
          results.failed.push({
            pincode: pincode || 'unknown',
            reason: 'Missing required fields (pincode, city, district, state)',
          });
          continue;
        }

        // Check if pincode already exists
        const existing = await Pincode.findOne({ pincode });

        if (existing) {
          results.duplicate.push({
            pincode,
            reason: 'Already exists',
          });
          continue;
        }

        // Create pincode with proper data mapping
        const pincodeData = {
          pincode,
          city,
          district,
          state,
          deliveryZone: deliveryZone || 'urban',
          estimatedDeliveryDays: {
            min: parseInt(deliveryDays) || 2,
            max: (parseInt(deliveryDays) || 2) + 2,
          },
          isServiceable: isServiceable === 'true',
          codAvailable: codAvailable === 'true',
        };

        await Pincode.create(pincodeData);
        results.success.push(pincode);
      } catch (error) {
        const pincodeValue = row.split(',')[0]?.trim() || 'unknown';
        results.failed.push({
          pincode: pincodeValue,
          reason: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Bulk upload completed',
      data: {
        total: dataRows.length,
        successful: results.success.length,
        failed: results.failed.length,
        duplicate: results.duplicate.length,
        details: results,
      },
    });
  } catch (error) {
    console.error('Error in bulk upload:', error);
    return res.status(500).json({
      success: false,
      message: 'Error in bulk upload',
      error: error.message,
    });
  }
};

/**
 * Get delivery zones statistics (Superadmin only)
 * @route   GET /api/superadmin/pincodes/stats
 * @access  Private/Superadmin
 */
export const getPincodeStats = async (req, res) => {
  try {
    const stats = await Pincode.aggregate([
      {
        $group: {
          _id: '$deliveryZone',
          count: { $sum: 1 },
          serviceable: {
            $sum: { $cond: ['$isServiceable', 1, 0] },
          },
          codAvailable: {
            $sum: { $cond: ['$codAvailable', 1, 0] },
          },
        },
      },
    ]);

    const totalPincodes = await Pincode.countDocuments();
    const serviceablePincodes = await Pincode.countDocuments({
      isServiceable: true,
    });

    return res.status(200).json({
      success: true,
      data: {
        total: totalPincodes,
        serviceable: serviceablePincodes,
        nonServiceable: totalPincodes - serviceablePincodes,
        byZone: stats,
      },
    });
  } catch (error) {
    console.error('Error fetching pincode stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching pincode stats',
      error: error.message,
    });
  }
};

/**
 * Download CSV template for bulk pincode upload
 * @route   GET /api/superadmin/pincodes/download-template
 * @access  Private/Superadmin
 */
export const downloadPincodeTemplate = async (req, res) => {
  try {
    const csvHeaders = [
      'pincode',
      'city',
      'district',
      'state',
      'deliveryZone',
      'deliveryDays',
      'isServiceable',
      'codAvailable',
    ];

    // Fetch all pincodes from database
    const pincodes = await Pincode.find({})
      .select('pincode city district state deliveryZone estimatedDeliveryDays isServiceable codAvailable')
      .lean();

    // Convert pincodes to CSV rows
    const csvRows = pincodes.map(pincode => {
      const deliveryDays = pincode.estimatedDeliveryDays?.min || 2;
      return [
        pincode.pincode,
        pincode.city,
        pincode.district,
        pincode.state,
        pincode.deliveryZone,
        deliveryDays,
        pincode.isServiceable,
        pincode.codAvailable
      ].join(',');
    });

    // If no pincodes exist, add sample data
    if (csvRows.length === 0) {
      csvRows.push(
        '560001,Bangalore,Bangalore Urban,Karnataka,metro,2,true,true',
        '110001,Delhi,Central Delhi,Delhi,metro,1,true,true',
        '400001,Mumbai,Mumbai City,Maharashtra,metro,2,true,true',
        '600001,Chennai,Chennai,Tamil Nadu,urban,3,true,true',
        '700001,Kolkata,Kolkata,West Bengal,urban,3,true,false'
      );
    }

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=pincode_export.csv');

    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error generating template:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating template',
      error: error.message,
    });
  }
};
