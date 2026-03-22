var express = require('express');
var router = express.Router();

router.get('/', (req, res) => {
    res.render('admin/dashboard',{
        activeTab: 'dashboard',
        layout : false ,
    });
});

router.get('/login',(req,res)=>{
    res.render('admin/login-admin',{
        layout:false
    })
}
)

router.get('/category',(req,res)=> {
    res.render('admin/category-management',{
        activeTab: 'categories' ,
        layout : false ,
    });
})

router.get('/order',(req,res)=> {
    res.render('admin/order-management',{
        activeTab: 'orders' ,
        layout : false ,
    });
})


router.get('/product',(req,res)=>{
    res.render('admin/product-management',{
        activeTab: 'products' ,
        layout : false ,
    });
})

router.get('/report',(req,res)=>{
    res.render('admin/reports',{
        activeTab: 'reports' ,
        layout : false ,
    });
})

router.get('/setting',(req,res)=>{
    res.render('admin/system-settings',{
        activeTab: 'settings' ,
        layout : false ,
    });
})

router.get('/user',(req,res)=>{
    res.render('admin/user-management',{
        activeTab: 'users' ,
        layout : false ,
    });
})

router.get('/coupon',(req,res)=>{
    res.render('admin/coupon-management',{
        activeTab: 'coupons' ,
        layout : false ,
    });
})

module.exports = router;