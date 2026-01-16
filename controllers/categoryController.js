import Category from '../models/Category.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import cacheManager, { TTL, CACHE_KEYS } from '../utils/cache.js';

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
export const getCategories = async (req, res, next) => {
  try {
    const cacheKey = CACHE_KEYS.CATEGORIES;

    // Try to get from cache
    const cachedCategories = cacheManager.get(cacheKey);
    if (cachedCategories) {
      return sendSuccess(res, 200, cachedCategories, 'Categories fetched successfully (cached)');
    }

    // Cache miss - fetch from database
    const categories = await Category.find({ isActive: true })
      .populate('parentCategory', 'name slug')
      .sort({ order: 1, name: 1 });

    // Cache for 1 hour
    cacheManager.set(cacheKey, categories, TTL.ONE_HOUR);

    sendSuccess(res, 200, categories, 'Categories fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get category by ID
// @route   GET /api/categories/:id
// @access  Public
export const getCategoryById = async (req, res, next) => {
  try {
    const cacheKey = `${CACHE_KEYS.CATEGORY}:${req.params.id}`;

    // Try to get from cache
    const cachedCategory = cacheManager.get(cacheKey);
    if (cachedCategory) {
      return sendSuccess(res, 200, cachedCategory, 'Category fetched successfully (cached)');
    }

    // Cache miss - fetch from database
    const category = await Category.findById(req.params.id)
      .populate('parentCategory', 'name slug');

    if (!category) {
      return sendError(res, 404, 'Category not found');
    }

    // Cache for 1 hour
    cacheManager.set(cacheKey, category, TTL.ONE_HOUR);

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

    // Check if category with same name exists
    const existingCategory = await Category.findOne({ name });
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

    // Invalidate category caches
    cacheManager.delete(CACHE_KEYS.CATEGORIES);
    cacheManager.delete(CACHE_KEYS.CATEGORY_TREE);
    cacheManager.deletePattern(`${CACHE_KEYS.CATEGORY}:*`);

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
      const existingCategory = await Category.findOne({ name });
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

    // Invalidate category caches
    cacheManager.delete(CACHE_KEYS.CATEGORIES);
    cacheManager.delete(CACHE_KEYS.CATEGORY_TREE);
    cacheManager.delete(`${CACHE_KEYS.CATEGORY}:${req.params.id}`);
    cacheManager.deletePattern(`${CACHE_KEYS.CATEGORY}:*`);

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

    // Check if there are child categories
    const childCategories = await Category.find({ parentCategory: category._id });
    if (childCategories.length > 0) {
      return sendError(res, 400, 'Cannot delete category with sub-categories. Delete sub-categories first.');
    }

    await category.deleteOne();

    // Invalidate category caches
    cacheManager.delete(CACHE_KEYS.CATEGORIES);
    cacheManager.delete(CACHE_KEYS.CATEGORY_TREE);
    cacheManager.delete(`${CACHE_KEYS.CATEGORY}:${req.params.id}`);
    cacheManager.deletePattern(`${CACHE_KEYS.CATEGORY}:*`);

    sendSuccess(res, 200, null, 'Category deleted successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get category tree (hierarchical structure)
// @route   GET /api/categories/tree
// @access  Public
export const getCategoryTree = async (req, res, next) => {
  try {
    const cacheKey = CACHE_KEYS.CATEGORY_TREE;

    // Try to get from cache
    const cachedTree = cacheManager.get(cacheKey);
    if (cachedTree) {
      return sendSuccess(res, 200, cachedTree, 'Category tree fetched successfully (cached)');
    }

    // Cache miss - fetch from database and build tree
    // Get all top-level categories (no parent)
    const topCategories = await Category.find({ parentCategory: null, isActive: true })
      .sort({ order: 1, name: 1 });

    // Build tree structure
    const buildTree = async (categories) => {
      const tree = [];
      for (const category of categories) {
        const children = await Category.find({
          parentCategory: category._id,
          isActive: true
        }).sort({ order: 1, name: 1 });

        tree.push({
          ...category.toObject(),
          children: children.length > 0 ? await buildTree(children) : []
        });
      }
      return tree;
    };

    const tree = await buildTree(topCategories);

    // Cache for 1 hour
    cacheManager.set(cacheKey, tree, TTL.ONE_HOUR);

    sendSuccess(res, 200, tree, 'Category tree fetched successfully');
  } catch (error) {
    next(error);
  }
};
