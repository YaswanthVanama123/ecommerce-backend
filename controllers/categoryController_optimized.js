import Category from '../models/Category.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  optimizedFind,
  optimizedFindOne,
  optimizedFindById
} from '../utils/queryOptimization.js';

// @desc    Get all categories (OPTIMIZED)
// @route   GET /api/categories
// @access  Public
export const getCategories = async (req, res, next) => {
  try {
    const categories = await optimizedFind(
      Category,
      { isActive: true },
      {
        select: 'name slug description image parentCategory order',
        populate: [
          { path: 'parentCategory', select: 'name slug' }
        ],
        sort: { order: 1, name: 1 },
        lean: true
      }
    );

    sendSuccess(res, 200, categories, 'Categories fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get category by ID (OPTIMIZED)
// @route   GET /api/categories/:id
// @access  Public
export const getCategoryById = async (req, res, next) => {
  try {
    const category = await optimizedFindById(
      Category,
      req.params.id,
      {
        select: 'name slug description image parentCategory order isActive',
        populate: [
          { path: 'parentCategory', select: 'name slug' }
        ],
        lean: true
      }
    );

    if (!category) {
      return sendError(res, 404, 'Category not found');
    }

    sendSuccess(res, 200, category, 'Category fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = async (req, res, next) => {
  try {
    const { name, description, image, parentCategory, order } = req.body;

    // Check if category with same name exists (optimized)
    const existingCategory = await Category.findOne({ name }).select('_id').lean().exec();
    if (existingCategory) {
      return sendError(res, 400, 'Category with this name already exists');
    }

    const category = await Category.create({
      name,
      description,
      image,
      parentCategory,
      order
    });

    sendSuccess(res, 201, category, 'Category created successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
export const updateCategory = async (req, res, next) => {
  try {
    const { name, description, image, parentCategory, isActive, order } = req.body;

    const category = await Category.findById(req.params.id);

    if (!category) {
      return sendError(res, 404, 'Category not found');
    }

    // Check if name is being changed and if it already exists
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ name }).select('_id').lean().exec();
      if (existingCategory) {
        return sendError(res, 400, 'Category with this name already exists');
      }
    }

    category.name = name || category.name;
    category.description = description !== undefined ? description : category.description;
    category.image = image !== undefined ? image : category.image;
    category.parentCategory = parentCategory !== undefined ? parentCategory : category.parentCategory;
    category.isActive = isActive !== undefined ? isActive : category.isActive;
    category.order = order !== undefined ? order : category.order;

    const updatedCategory = await category.save();

    sendSuccess(res, 200, updatedCategory, 'Category updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return sendError(res, 404, 'Category not found');
    }

    // Check if there are child categories (optimized)
    const childCategories = await Category.find({ parentCategory: category._id })
      .select('_id')
      .limit(1)
      .lean()
      .exec();

    if (childCategories.length > 0) {
      return sendError(res, 400, 'Cannot delete category with sub-categories. Delete sub-categories first.');
    }

    await category.deleteOne();

    sendSuccess(res, 200, null, 'Category deleted successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get category tree (hierarchical structure) (OPTIMIZED)
// @route   GET /api/categories/tree
// @access  Public
export const getCategoryTree = async (req, res, next) => {
  try {
    // Fetch all categories in one query for better performance
    const allCategories = await Category.find({ isActive: true })
      .select('name slug description image parentCategory order')
      .sort({ order: 1, name: 1 })
      .lean()
      .exec();

    // Build tree structure in memory (more efficient than multiple DB queries)
    const buildTree = (categories, parentId = null) => {
      return categories
        .filter(cat => {
          if (parentId === null) {
            return !cat.parentCategory;
          }
          return cat.parentCategory && cat.parentCategory.toString() === parentId.toString();
        })
        .map(cat => ({
          ...cat,
          children: buildTree(categories, cat._id)
        }));
    };

    const tree = buildTree(allCategories);

    sendSuccess(res, 200, tree, 'Category tree fetched successfully');
  } catch (error) {
    next(error);
  }
};
