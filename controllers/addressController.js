import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// @desc    Get all addresses for logged-in user
// @route   GET /api/addresses
// @access  Private
export const getAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    sendSuccess(res, 200, { addresses: user.addresses || [] }, 'Addresses fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Add new address
// @route   POST /api/addresses
// @access  Private
export const addAddress = async (req, res, next) => {
  try {
    const { fullName, phone, addressLine1, addressLine2, city, state, zipCode, country, isDefault } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // If this is set as default, unset all other default addresses
    if (isDefault) {
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    // If this is the first address, make it default automatically
    const makeDefault = user.addresses.length === 0 || isDefault;

    const newAddress = {
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      country: country || 'India',
      isDefault: makeDefault
    };

    user.addresses.push(newAddress);
    await user.save();

    const addedAddress = user.addresses[user.addresses.length - 1];

    sendSuccess(res, 201, { address: addedAddress }, 'Address added successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Update address
// @route   PUT /api/addresses/:id
// @access  Private
export const updateAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullName, phone, addressLine1, addressLine2, city, state, zipCode, country, isDefault } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const address = user.addresses.id(id);

    if (!address) {
      return sendError(res, 404, 'Address not found');
    }

    // If setting as default, unset all other default addresses
    if (isDefault && !address.isDefault) {
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    // Update address fields
    address.fullName = fullName || address.fullName;
    address.phone = phone || address.phone;
    address.addressLine1 = addressLine1 || address.addressLine1;
    address.addressLine2 = addressLine2 !== undefined ? addressLine2 : address.addressLine2;
    address.city = city || address.city;
    address.state = state || address.state;
    address.zipCode = zipCode || address.zipCode;
    address.country = country || address.country;
    address.isDefault = isDefault !== undefined ? isDefault : address.isDefault;

    await user.save();

    sendSuccess(res, 200, { address }, 'Address updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete address
// @route   DELETE /api/addresses/:id
// @access  Private
export const deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user._id);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const address = user.addresses.id(id);

    if (!address) {
      return sendError(res, 404, 'Address not found');
    }

    // Don't allow deleting the only address if it's default
    if (user.addresses.length === 1) {
      return sendError(res, 400, 'Cannot delete the only address');
    }

    const wasDefault = address.isDefault;

    // Remove the address
    address.remove();

    // If deleted address was default, make the first remaining address default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    sendSuccess(res, 200, null, 'Address deleted successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Set default address
// @route   PUT /api/addresses/:id/default
// @access  Private
export const setDefaultAddress = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user._id);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    const address = user.addresses.id(id);

    if (!address) {
      return sendError(res, 404, 'Address not found');
    }

    // Unset all other default addresses
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });

    // Set this address as default
    address.isDefault = true;

    await user.save();

    sendSuccess(res, 200, { address }, 'Default address set successfully');
  } catch (error) {
    next(error);
  }
};
