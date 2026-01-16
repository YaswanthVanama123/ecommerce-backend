export const sendSuccess = (res, statusCode = 200, data = null, message = 'Success') => {
  // Properly serialize MongoDB ObjectIds by converting to JSON and back
  const serializedData = data ? JSON.parse(JSON.stringify(data)) : null;

  res.status(statusCode).json({
    success: true,
    message,
    data: serializedData
  });
};

export const sendError = (res, statusCode = 500, message = 'Internal Server Error', errors = null) => {
  console.error('\n========================================');
  console.error('[SEND ERROR] Error Response');
  console.error('========================================');
  console.error('Status Code:', statusCode);
  console.error('Message:', message);
  if (errors) {
    console.error('Detailed Errors:');
    console.error(JSON.stringify(errors, null, 2));
  }
  console.error('========================================\n');

  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
    ...(errors && { errors })
  });
};
