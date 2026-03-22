const jwt = require('jsonwebtoken');

module.exports.checkAuth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Không có token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
   
    req.user = decoded;
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

exports.checkRole = (roles) => {
  if (!Array.isArray(roles)) {
    throw new Error('❌ checkRole cần truyền vào một mảng roles, ví dụ: checkRole(["seller"])');
  }
  
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Không đủ quyền truy cập' });
    }
    next();
  };
};
