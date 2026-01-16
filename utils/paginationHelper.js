/**
 * Pagination Helper Utility
 * Provides standardized pagination functions for database queries
 * Supports both offset-based and cursor-based pagination for optimal performance
 */

/**
 * Calculate pagination parameters
 * @param {number} page - Current page number (1-based)
 * @param {number} limit - Items per page
 * @returns {Object} Object containing skip and limit values
 */
export const getPaginationParams = (page = 1, limit = 20) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20)); // Max 100 items per page

  return {
    page: pageNum,
    limit: limitNum,
    skip: (pageNum - 1) * limitNum
  };
};

/**
 * Build pagination metadata
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total documents
 * @returns {Object} Pagination metadata
 */
export const getPaginationMetadata = (page, limit, total) => {
  const pages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    pages,
    hasNextPage: page < pages,
    hasPrevPage: page > 1,
    nextPage: page < pages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  };
};

/**
 * Format paginated response
 * @param {Array} data - Array of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total documents
 * @returns {Object} Formatted pagination response
 */
export const formatPaginatedResponse = (data, page, limit, total) => {
  return {
    data,
    pagination: getPaginationMetadata(page, limit, total)
  };
};

/**
 * Execute paginated query with lean for better performance
 * @param {Query} query - Mongoose query object
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {boolean} lean - Use lean() for better performance (default: true)
 * @returns {Promise<Array>} Paginated results
 */
export const executePagedQuery = async (query, page = 1, limit = 20, lean = true) => {
  const { skip, limit: finalLimit } = getPaginationParams(page, limit);

  let finalQuery = query.skip(skip).limit(finalLimit);

  if (lean) {
    finalQuery = finalQuery.lean();
  }

  return await finalQuery.exec();
};

/**
 * Get count for paginated query (optimized using countDocuments)
 * @param {Query} countQuery - Mongoose query for counting
 * @returns {Promise<number>} Total count
 */
export const getPagedQueryCount = async (countQuery) => {
  return await countQuery.countDocuments().exec();
};

/**
 * Execute full paginated operation (query + count)
 * @param {Query} dataQuery - Query for fetching data
 * @param {Query} countQuery - Query for counting total
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {boolean} lean - Use lean() for data query
 * @returns {Promise<Object>} Data and pagination metadata
 */
export const executePaginatedOperation = async (
  dataQuery,
  countQuery,
  page = 1,
  limit = 20,
  lean = true
) => {
  const { page: finalPage, limit: finalLimit } = getPaginationParams(page, limit);

  // Execute both queries in parallel for better performance
  const [data, total] = await Promise.all([
    executePagedQuery(dataQuery, finalPage, finalLimit, lean),
    getPagedQueryCount(countQuery)
  ]);

  return formatPaginatedResponse(data, finalPage, finalLimit, total);
};

/**
 * Build sort options from query parameters
 * @param {string} sortParam - Sort parameter (e.g., "price-low", "rating", "newest")
 * @param {Object} sortMap - Mapping of sort parameters to MongoDB sort objects
 * @returns {Object} MongoDB sort object
 */
export const buildSortOptions = (sortParam, sortMap = {}) => {
  const defaultSort = { createdAt: -1 };

  if (!sortParam || !sortMap[sortParam]) {
    return defaultSort;
  }

  return sortMap[sortParam];
};

/**
 * Parse field selection from query parameter
 * @param {string} fields - Comma-separated list of fields
 * @param {Array} defaultFields - Default fields if none specified
 * @param {Array} excludedFields - Fields that should never be included
 * @returns {string} Space-separated field string for select()
 */
export const parseFieldSelection = (fields, defaultFields = [], excludedFields = []) => {
  if (!fields) {
    return defaultFields.length > 0 ? defaultFields.join(' ') : '';
  }

  const requestedFields = fields.split(',').map(f => f.trim()).filter(f => f);

  // Remove any excluded fields
  const allowedFields = requestedFields.filter(field =>
    !excludedFields.includes(field.replace('-', ''))
  );

  return allowedFields.join(' ');
};

/**
 * CURSOR-BASED PAGINATION
 * More efficient for large datasets and real-time updates
 * Better performance as it doesn't use skip()
 */

/**
 * Parse cursor from encoded string
 * @param {string} cursor - Base64 encoded cursor
 * @returns {Object|null} Decoded cursor object
 */
export const parseCursor = (cursor) => {
  if (!cursor) return null;

  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
};

/**
 * Encode cursor to base64 string
 * @param {Object} cursorData - Cursor data object
 * @returns {string} Base64 encoded cursor
 */
export const encodeCursor = (cursorData) => {
  if (!cursorData) return null;

  const json = JSON.stringify(cursorData);
  return Buffer.from(json, 'utf-8').toString('base64');
};

/**
 * Build cursor-based query filter
 * @param {Object} cursor - Parsed cursor object
 * @param {string} sortField - Field to sort by (default: '_id')
 * @param {number} sortOrder - Sort order: 1 for asc, -1 for desc
 * @returns {Object} MongoDB filter object
 */
export const buildCursorFilter = (cursor, sortField = '_id', sortOrder = -1) => {
  if (!cursor || !cursor[sortField]) {
    return {};
  }

  const operator = sortOrder === 1 ? '$gt' : '$lt';

  return {
    [sortField]: { [operator]: cursor[sortField] }
  };
};

/**
 * Execute cursor-based paginated query
 * @param {Query} query - Base Mongoose query
 * @param {Object} options - Pagination options
 * @param {string} options.cursor - Current cursor
 * @param {number} options.limit - Items per page
 * @param {string} options.sortField - Field to sort by
 * @param {number} options.sortOrder - Sort order (1 or -1)
 * @param {boolean} options.lean - Use lean queries
 * @returns {Promise<Object>} Paginated results with cursors
 */
export const executeCursorPaginatedQuery = async (
  query,
  {
    cursor = null,
    limit = 20,
    sortField = '_id',
    sortOrder = -1,
    lean = true
  } = {}
) => {
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));

  // Parse cursor and build filter
  const parsedCursor = parseCursor(cursor);
  const cursorFilter = buildCursorFilter(parsedCursor, sortField, sortOrder);

  // Apply cursor filter if exists
  if (Object.keys(cursorFilter).length > 0) {
    query = query.where(cursorFilter);
  }

  // Apply sort and limit (fetch one extra to check if there's more data)
  let finalQuery = query
    .sort({ [sortField]: sortOrder })
    .limit(limitNum + 1);

  if (lean) {
    finalQuery = finalQuery.lean();
  }

  const results = await finalQuery.exec();

  // Check if there are more results
  const hasNextPage = results.length > limitNum;
  const data = hasNextPage ? results.slice(0, limitNum) : results;

  // Generate next cursor from last item
  let nextCursor = null;
  if (hasNextPage && data.length > 0) {
    const lastItem = data[data.length - 1];
    nextCursor = encodeCursor({
      [sortField]: lastItem[sortField]
    });
  }

  return {
    data,
    pagination: {
      limit: limitNum,
      hasNextPage,
      nextCursor,
      sortField,
      sortOrder
    }
  };
};

/**
 * Execute cursor-based paginated operation with total count (optional)
 * Note: Counting defeats some performance benefits of cursor pagination
 * Only use when total count is absolutely necessary
 * @param {Query} dataQuery - Query for fetching data
 * @param {Query} countQuery - Query for counting total (optional)
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Paginated results with cursors and optional total
 */
export const executeCursorPaginatedOperationWithCount = async (
  dataQuery,
  countQuery = null,
  options = {}
) => {
  const queries = [executeCursorPaginatedQuery(dataQuery, options)];

  // Only add count query if provided
  if (countQuery) {
    queries.push(getPagedQueryCount(countQuery));
  }

  const results = await Promise.all(queries);

  const response = results[0];

  if (countQuery) {
    response.pagination.total = results[1];
  }

  return response;
};

/**
 * Helper to determine pagination strategy
 * @param {Object} query - Request query parameters
 * @returns {Object} Pagination strategy and params
 */
export const determinePaginationStrategy = (query) => {
  // If cursor is present, use cursor-based pagination
  if (query.cursor) {
    return {
      strategy: 'cursor',
      params: {
        cursor: query.cursor,
        limit: parseInt(query.limit) || 20,
        sortField: query.sortField || '_id',
        sortOrder: query.sortOrder === 'asc' ? 1 : -1
      }
    };
  }

  // Default to offset-based pagination
  return {
    strategy: 'offset',
    params: {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 20
    }
  };
};

export default {
  // Offset-based pagination
  getPaginationParams,
  getPaginationMetadata,
  formatPaginatedResponse,
  executePagedQuery,
  getPagedQueryCount,
  executePaginatedOperation,
  buildSortOptions,
  parseFieldSelection,

  // Cursor-based pagination
  parseCursor,
  encodeCursor,
  buildCursorFilter,
  executeCursorPaginatedQuery,
  executeCursorPaginatedOperationWithCount,
  determinePaginationStrategy
};
