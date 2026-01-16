export const errorHandler = (err, req, res, next) => {
  console.error('\n========================================');
  console.error('[ERROR HANDLER] Error occurred');
  console.error('========================================');
  console.error('Error Name:', err.name);
  console.error('Error Message:', err.message);
  console.error('Error Code:', err.code);

  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    console.error('\n[VALIDATION ERROR] Details:');
    const errors = Object.values(err.errors).map(e => {
      console.error(`  - Field: ${e.path}`);
      console.error(`    Message: ${e.message}`);
      console.error(`    Value: ${e.value}`);
      console.error(`    Kind: ${e.kind}`);
      return e.message;
    });
    statusCode = 400;
    message = `Validation failed: ${errors.join(', ')}`;
    console.error('\nFormatted Error Message:', message);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    console.error('\n[CAST ERROR] Details:');
    console.error(`  - Path: ${err.path}`);
    console.error(`  - Value: ${err.value}`);
    console.error(`  - Kind: ${err.kind}`);
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    console.error('\n[DUPLICATE KEY ERROR] Details:');
    console.error('  - Key Pattern:', err.keyPattern);
    console.error('  - Key Value:', err.keyValue);
    statusCode = 400;
    const field = Object.keys(err.keyPattern)[0];
    message = `${field} already exists`;
  }

  console.error('\nFinal Response Status:', statusCode);
  console.error('Final Response Message:', message);
  console.error('========================================\n');

  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    ...(err.name === 'ValidationError' && { errors: err.errors })
  });
};

export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};
