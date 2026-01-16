/**
 * Query Optimization and Performance Utility
 * Provides best practices and helper functions for database query optimization
 */

/**
 * Apply lean to read-only queries for better performance
 * Converts Mongoose documents to plain JavaScript objects
 * 10-20% performance improvement
 *
 * @param {Query} query - Mongoose query
 * @param {boolean} shouldLean - Whether to apply lean (default: true)
 * @returns {Query} Modified query
 */
export const applyLean = (query, shouldLean = true) => {
  return shouldLean ? query.lean() : query;
};

/**
 * Apply field selection to limit returned data
 * Reduces document size and network transfer
 *
 * @param {Query} query - Mongoose query
 * @param {string|Array|Object} fields - Fields to select
 * @returns {Query} Modified query
 */
export const applyFieldSelection = (query, fields) => {
  if (!fields) return query;

  if (typeof fields === 'string') {
    return query.select(fields);
  } else if (Array.isArray(fields)) {
    return query.select(fields.join(' '));
  } else if (typeof fields === 'object') {
    return query.select(fields);
  }

  return query;
};

/**
 * Apply optimized population with field selection
 * Limits populated fields to reduce data transfer
 *
 * @param {Query} query - Mongoose query
 * @param {Array} populations - Array of population configs
 * @returns {Query} Modified query
 *
 * @example
 * applyOptimizedPopulate(query, [
 *   { path: 'user', select: 'name email' },
 *   { path: 'category', select: 'name slug', options: { lean: true } }
 * ])
 */
export const applyOptimizedPopulate = (query, populations = []) => {
  if (!Array.isArray(populations) || populations.length === 0) {
    return query;
  }

  populations.forEach(pop => {
    const populateOptions = {
      path: pop.path,
      select: pop.select || '',
      options: { lean: true, ...(pop.options || {}) }
    };

    if (pop.match) {
      populateOptions.match = pop.match;
    }

    query.populate(populateOptions);
  });

  return query;
};

/**
 * Create optimized query builder
 * Combines lean, select, and populate for maximum efficiency
 *
 * @param {Model} Model - Mongoose model
 * @param {Object} options - Query options
 * @returns {Query} Optimized query
 */
export const buildOptimizedQuery = (Model, options = {}) => {
  const {
    filter = {},
    select = '',
    populate = [],
    sort = {},
    limit = null,
    skip = null,
    lean = true
  } = options;

  let query = Model.find(filter);

  // Apply field selection
  if (select) {
    query = applyFieldSelection(query, select);
  }

  // Apply population
  if (populate.length > 0) {
    query = applyOptimizedPopulate(query, populate);
  }

  // Apply sort
  if (Object.keys(sort).length > 0) {
    query = query.sort(sort);
  }

  // Apply pagination
  if (skip !== null) {
    query = query.skip(skip);
  }
  if (limit !== null) {
    query = query.limit(limit);
  }

  // Apply lean
  query = applyLean(query, lean);

  return query;
};

/**
 * Execute optimized find operation
 * Wrapper for common read operations with best practices
 *
 * @param {Model} Model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Query results
 */
export const optimizedFind = async (Model, filter = {}, options = {}) => {
  const query = buildOptimizedQuery(Model, { filter, ...options });
  return await query.exec();
};

/**
 * Execute optimized findOne operation
 *
 * @param {Model} Model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {Object} options - Query options
 * @returns {Promise<Object|null>} Query result
 */
export const optimizedFindOne = async (Model, filter = {}, options = {}) => {
  const { select = '', populate = [], lean = true } = options;

  let query = Model.findOne(filter);

  if (select) {
    query = applyFieldSelection(query, select);
  }

  if (populate.length > 0) {
    query = applyOptimizedPopulate(query, populate);
  }

  query = applyLean(query, lean);

  return await query.exec();
};

/**
 * Execute optimized findById operation
 *
 * @param {Model} Model - Mongoose model
 * @param {string} id - Document ID
 * @param {Object} options - Query options
 * @returns {Promise<Object|null>} Query result
 */
export const optimizedFindById = async (Model, id, options = {}) => {
  const { select = '', populate = [], lean = true } = options;

  let query = Model.findById(id);

  if (select) {
    query = applyFieldSelection(query, select);
  }

  if (populate.length > 0) {
    query = applyOptimizedPopulate(query, populate);
  }

  query = applyLean(query, lean);

  return await query.exec();
};

/**
 * Execute batch queries in parallel
 * Significantly reduces total query time
 *
 * @param {Array<Promise>} queries - Array of query promises
 * @returns {Promise<Array>} Results from all queries
 */
export const executeBatchQueries = async (queries) => {
  return await Promise.all(queries);
};

/**
 * Execute batch queries with error handling
 * Uses Promise.allSettled to handle individual failures gracefully
 *
 * @param {Array<Promise>} queries - Array of query promises
 * @returns {Promise<Array>} Results with status information
 */
export const executeBatchQueriesSafe = async (queries) => {
  const results = await Promise.allSettled(queries);

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return { success: true, data: result.value, index };
    } else {
      return { success: false, error: result.reason, index };
    }
  });
};

/**
 * Execute optimized count operation
 * Uses countDocuments for accurate count with filters
 *
 * @param {Model} Model - Mongoose model
 * @param {Object} filter - Query filter
 * @returns {Promise<number>} Document count
 */
export const optimizedCount = async (Model, filter = {}) => {
  return await Model.countDocuments(filter).exec();
};

/**
 * Execute fast approximate count
 * Uses estimatedDocumentCount for quick count without filters
 * Much faster than countDocuments but doesn't support filters
 *
 * @param {Model} Model - Mongoose model
 * @returns {Promise<number>} Approximate document count
 */
export const optimizedEstimatedCount = async (Model) => {
  return await Model.estimatedDocumentCount().exec();
};

/**
 * Create optimized aggregation pipeline
 * Helper for building efficient aggregation queries
 *
 * @param {Model} Model - Mongoose model
 * @param {Array} pipeline - Aggregation pipeline stages
 * @param {Object} options - Aggregation options
 * @returns {Promise<Array>} Aggregation results
 */
export const optimizedAggregate = async (Model, pipeline = [], options = {}) => {
  const aggregation = Model.aggregate(pipeline);

  if (options.allowDiskUse) {
    aggregation.allowDiskUse(true);
  }

  if (options.explain) {
    return await aggregation.explain();
  }

  return await aggregation.exec();
};

/**
 * Batch insert documents efficiently
 * Uses insertMany for better performance than multiple inserts
 *
 * @param {Model} Model - Mongoose model
 * @param {Array} documents - Documents to insert
 * @param {Object} options - Insert options
 * @returns {Promise<Array>} Inserted documents
 */
export const optimizedBatchInsert = async (Model, documents = [], options = {}) => {
  return await Model.insertMany(documents, {
    ordered: false, // Continue on error
    lean: true,
    ...options
  });
};

/**
 * Batch update documents efficiently
 * Uses bulkWrite for optimal performance
 *
 * @param {Model} Model - Mongoose model
 * @param {Array} updates - Array of update operations
 * @returns {Promise<Object>} Update results
 */
export const optimizedBatchUpdate = async (Model, updates = []) => {
  const bulkOps = updates.map(update => ({
    updateOne: {
      filter: update.filter,
      update: update.update,
      upsert: update.upsert || false
    }
  }));

  return await Model.bulkWrite(bulkOps, { ordered: false });
};

/**
 * Cache query results (simple in-memory cache)
 * Use Redis or similar for production
 *
 * @param {string} key - Cache key
 * @param {Function} queryFn - Function that executes the query
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Promise<any>} Cached or fresh data
 */
const queryCache = new Map();

export const cachedQuery = async (key, queryFn, ttl = 60000) => {
  const cached = queryCache.get(key);

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const data = await queryFn();

  queryCache.set(key, {
    data,
    timestamp: Date.now()
  });

  // Cleanup old cache entries periodically
  if (queryCache.size > 100) {
    const now = Date.now();
    for (const [cacheKey, value] of queryCache.entries()) {
      if (now - value.timestamp > ttl) {
        queryCache.delete(cacheKey);
      }
    }
  }

  return data;
};

/**
 * Clear cache for a specific key or all cache
 *
 * @param {string|null} key - Cache key to clear, or null for all
 */
export const clearQueryCache = (key = null) => {
  if (key) {
    queryCache.delete(key);
  } else {
    queryCache.clear();
  }
};

/**
 * Index usage recommendations
 */
export const indexRecommendations = {
  // Common index patterns
  singleField: 'Model.index({ fieldName: 1 })',
  compound: 'Model.index({ field1: 1, field2: 1, field3: 1 })',
  textSearch: 'Model.index({ field1: "text", field2: "text" })',
  unique: 'Model.index({ fieldName: 1 }, { unique: true })',
  sparse: 'Model.index({ fieldName: 1 }, { sparse: true })',

  // Guidelines
  guidelines: [
    'Create indexes for fields used in WHERE clauses',
    'Create indexes for fields used in SORT operations',
    'Use compound indexes for queries that filter on multiple fields',
    'Index foreign key fields used in $lookup or populate',
    'Monitor index usage with explain() and remove unused indexes',
    'Each index slows down write operations - balance read vs write performance',
    'Limit to 5-10 indexes per collection in most cases'
  ]
};

/**
 * Query performance analyzer
 * Helps identify slow queries and optimization opportunities
 *
 * @param {Query} query - Mongoose query
 * @returns {Promise<Object>} Query execution plan
 */
export const analyzeQuery = async (query) => {
  return await query.explain('executionStats');
};

/**
 * Best practices checklist for queries
 */
export const queryOptimizationChecklist = {
  readOnlyOperations: [
    'Use .lean() for all read-only queries',
    'Use .select() to limit fields returned',
    'Limit .populate() calls and specify fields to populate',
    'Use .limit() to cap result size',
    'Add appropriate indexes for filter and sort fields'
  ],

  writeOperations: [
    'Use bulkWrite() for batch updates',
    'Use insertMany() for batch inserts',
    'Avoid validating on every write if not necessary',
    'Use atomic operators ($inc, $push, etc.) instead of read-modify-write'
  ],

  pagination: [
    'Use cursor-based pagination for large datasets',
    'Avoid skip() with large offsets',
    'Execute count and data queries in parallel with Promise.all()',
    'Consider removing total count for better performance'
  ],

  aggregation: [
    'Use $match early in pipeline to reduce documents',
    'Use $project to limit fields before $lookup',
    'Use indexes in $match and $sort stages',
    'Use allowDiskUse for large aggregations',
    'Consider using $facet for multiple aggregations'
  ]
};

export default {
  applyLean,
  applyFieldSelection,
  applyOptimizedPopulate,
  buildOptimizedQuery,
  optimizedFind,
  optimizedFindOne,
  optimizedFindById,
  executeBatchQueries,
  executeBatchQueriesSafe,
  optimizedCount,
  optimizedEstimatedCount,
  optimizedAggregate,
  optimizedBatchInsert,
  optimizedBatchUpdate,
  cachedQuery,
  clearQueryCache,
  indexRecommendations,
  analyzeQuery,
  queryOptimizationChecklist
};
