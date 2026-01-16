export const roleCheck = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      return next(new Error('Not authorized'));
    }

    console.log('\n========================================');
    console.log('[ROLE CHECK] Debug Info');
    console.log('========================================');
    console.log('User ID:', req.user._id);
    console.log('User Email:', req.user.email);
    console.log('User Role:', req.user.role);
    console.log('User Role Type:', typeof req.user.role);
    console.log('Required Roles:', roles);
    console.log('Role Match:', roles.includes(req.user.role));
    console.log('========================================\n');

    if (!roles.includes(req.user.role)) {
      res.status(403);
      return next(new Error(`Access denied. Required roles: ${roles.join(', ')}`));
    }

    next();
  };
};

export const isAdmin = roleCheck('admin', 'superadmin');
export const isSuperAdmin = roleCheck('superadmin');
