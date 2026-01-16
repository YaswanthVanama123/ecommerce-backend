export const errorHandler = (err, req, res, next) => {
  console.error('[ERROR HANDLER] ', err);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);

  res.json({
    success: false,
    message: err.message,
    statusCode,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};
