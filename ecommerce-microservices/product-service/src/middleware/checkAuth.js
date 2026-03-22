const jwt = require('jsonwebtoken');

exports.checkAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // 'Bearer token'
  
  if (!token) {
    return res.status(401).json({ message: 'Không có token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify đúng SECRET
    
    req.user = decoded; // Gán thông tin user vào req.user
    next();
  } catch (err) {
    console.error('JWT lỗi:', err);
    return res.status(403).json({ message: 'Token không hợp lệ' });
  }
};

exports.checkRole = (roles) => {
  if (!Array.isArray(roles)) {
    throw new Error('❌ checkRole cần truyền vào một mảng roles, ví dụ: checkRole(["seller"])');
  }
  
  return (req, res, next) => {
    const userRole = req.user.role;
    const normalizedUserRole = userRole ? userRole.toLowerCase() : null;
    const normalizedRoles = roles.map(r => r.toLowerCase());
    
    console.log('🔐 CheckRole - User role:', userRole, 'Normalized:', normalizedUserRole);
    console.log('🔐 CheckRole - Required roles:', roles, 'Normalized:', normalizedRoles);
    
    if (!normalizedRoles.includes(normalizedUserRole)) {
      console.log('❌ CheckRole - Không đủ quyền. User role:', userRole, 'Required:', roles);
      return res.status(403).json({ 
        message: 'Không đủ quyền truy cập',
        debug: {
          userRole: userRole,
          requiredRoles: roles,
          userInfo: req.user
        }
      });
    }
    console.log('✅ CheckRole - Đủ quyền');
    next();
  };
};
