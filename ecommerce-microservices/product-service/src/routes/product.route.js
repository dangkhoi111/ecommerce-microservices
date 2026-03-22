
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/product.controller');
const upload = require('../multerConfig');
const { checkAuth,checkRole } = require('../middleware/checkAuth');

router.post('/sanphams',checkAuth,checkRole(['seller']),upload.single('hinhAnh'), ctrl.create);
router.get('/sanphams',checkAuth,checkRole(['seller']), ctrl.getAll);
router.get('/sanphams/:id',ctrl.getOne);
router.put('/sanphams/:id',checkAuth,checkRole(['seller']),upload.single('hinhAnh') ,ctrl.update);
router.delete('/sanphams/:id',checkAuth,checkRole(['seller','admin']), ctrl.delete);
router.get('/sanphams/danhmuc/:id',ctrl.getSpDm);
router.get('/admin/sanphams',checkAuth,checkRole(['admin']), ctrl.getAllForAdmin);
router.get('/public/sanphams', ctrl.getAllPublic);
router.get('/public/sanphams/shop/:maUserBan', ctrl.getSanPhamByShop);
router.get('/public/sanphams/search', ctrl.searchSanPham);
module.exports = router;