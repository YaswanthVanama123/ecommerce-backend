export const roleCheck = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      return next(new Error('Not authorized'));
    }

    if (!roles.includes(req.user.role)) {
      res.status(403);
      return next(new Error(`Access denied. Required roles: ${roles.join(', ')}`));
    }

    next();
  };
};

export const isAdmin = roleCheck('admin', 'superadmin');
export const isSuperAdmin = roleCheck('superadmin');
