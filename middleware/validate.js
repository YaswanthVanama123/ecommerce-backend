import { sendError } from '../utils/apiResponse.js';

/**
 * Validation middleware for Joi schemas
 * @param {Object} schema - Joi schema to validate against
 * @param {String} source - Where to validate from: 'body', 'query', 'params', or 'all'
 * @returns {Function} Express middleware function
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      let dataToValidate = {};

      // Determine what data to validate based on source
      switch (source) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        case 'all':
          dataToValidate = {
            body: req.body,
            query: req.query,
            params: req.params
          };
          break;
        default:
          dataToValidate = req.body;
      }

      console.log('\n[VALIDATION] Validating request data...');
      console.log('Source:', source);
      console.log('Data being validated:', JSON.stringify(dataToValidate, null, 2));

      // Validate data against schema
      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false,
        stripUnknown: true,
        messages: {
          'string.empty': '{#label} is required and cannot be empty',
          'string.email': '{#label} must be a valid email address',
          'string.min': '{#label} must have at least {#limit} characters',
          'string.max': '{#label} must not exceed {#limit} characters',
          'string.pattern.base': '{#label} format is invalid',
          'number.base': '{#label} must be a number',
          'number.min': '{#label} must be at least {#limit}',
          'number.max': '{#label} must not exceed {#limit}',
          'number.positive': '{#label} must be a positive number',
          'any.required': '{#label} is required',
          'array.base': '{#label} must be an array',
          'array.min': '{#label} must contain at least {#limit} items',
          'array.max': '{#label} must not exceed {#limit} items'
        }
      });

      // If validation errors exist
      if (error) {
        console.error('\n[VALIDATION FAILED]');
        const messages = error.details.map(detail => {
          console.error(`  - Field: ${detail.path.join('.')}`);
          console.error(`    Message: ${detail.message}`);
          console.error(`    Type: ${detail.type}`);
          return {
            field: detail.path.join('.'),
            message: detail.message
          };
        });
        console.error('\n');

        return sendError(res, 400, 'Validation failed', messages);
      }

      console.log('[VALIDATION] Validation passed successfully\n');

      // Replace request data with validated data
      if (source === 'body') {
        req.body = value;
      } else if (source === 'query') {
        // req.query is read-only, can't replace it
        // Just validate without replacing
        console.log('[VALIDATION] Query validated successfully (not replaced as req.query is read-only)');
      } else if (source === 'params') {
        req.params = value;
      } else if (source === 'all') {
        req.body = value.body;
        // req.query = value.query; // Can't set query
        req.params = value.params;
      }

      next();
    } catch (err) {
      console.error('[VALIDATION ERROR] Exception:', err);
      console.error('[VALIDATION ERROR] Stack:', err.stack);
      return sendError(res, 500, 'Validation error', err.message || 'An error occurred during validation');
    }
  };
};

/**
 * Higher-order function to create a validation middleware for multiple sources
 * @param {Object} schemas - Object with keys 'body', 'query', 'params'
 * @returns {Function} Express middleware function
 */
export const validateMultiple = (schemas) => {
  return async (req, res, next) => {
    try {
      const allErrors = [];

      // Validate each source if schema exists
      for (const [source, schema] of Object.entries(schemas)) {
        if (schema) {
          const { error, value } = schema.validate(
            source === 'body' ? req.body : source === 'query' ? req.query : req.params,
            {
              abortEarly: false,
              stripUnknown: true
            }
          );

          if (error) {
            const messages = error.details.map(detail => ({
              field: `${source}.${detail.path.join('.')}`,
              message: detail.message
            }));
            allErrors.push(...messages);
          } else {
            if (source === 'body') req.body = value;
            // if (source === 'query') req.query = value; // Can't set query (read-only)
            if (source === 'params') req.params = value;
          }
        }
      }

      if (allErrors.length > 0) {
        return sendError(res, 400, 'Validation failed', allErrors);
      }

      next();
    } catch (err) {
      console.error('[VALIDATION ERROR] Exception in validateMultiple:', err);
      console.error('[VALIDATION ERROR] Stack:', err.stack);
      return sendError(res, 500, 'Validation error', err.message || 'An error occurred during validation');
    }
  };
};
