export const sendSuccess = (res, statusCode = 200, data = null, message = 'Success') => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

export const sendError = (res, statusCode = 500, message = 'Internal Server Error') => {
  res.status(statusCode).json({
    success: false,
    message,
    statusCode
  });
};
