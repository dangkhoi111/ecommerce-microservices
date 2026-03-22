var express = require('express');
var router = express.Router();

router.get('/',(req,res)=>{
    res.render('seller/seller-channel',{
        activeTab: 'dashboard',
        layout : false ,
    });
})


router.get('/product',(req,res)=> {
    res.render('seller/seller-product',{
        activeTab: 'product' ,
        layout : false ,
    });
})

router.get('/order-detail/:id',(req,res)=> {
    res.render('seller/seller-order-detail',{
        activeTab: 'order' ,
        layout : false ,
    });
})

router.get('/product/version',(req,res)=> {
    res.render('seller/seller-product-version',{
        activeTab: 'product' ,
        layout : false ,
    });
})


router.get('/sale',(req,res)=>{
    res.render('seller/seller-sale',{
        activeTab: 'promotions' ,
        layout : false ,
    });
})

router.get('/finance',(req,res)=>{
    res.render('seller/seller-finance',{
        activeTab: 'finance' ,
        layout : false ,
    });
})

router.get('/order',(req,res)=>{
    res.render('seller/seller-order',{
        activeTab: 'order' ,
        layout : false ,
    });
})

router.get('/setting',(req,res)=>{
    res.render('seller/seller-setting',{
        activeTab: 'setting' ,
        layout : false ,
    });
})

router.get('/analytic',(req,res)=>{
    res.render('seller/seller-analytic',{
        activeTab: 'analytic' ,
        layout : false ,
    });
})

router.get('/register',(req,res)=>{
    res.render('seller/seller-register',{
        layout : false ,
    });
})

// Redirect old promotion route to sale
router.get('/promotion',(req,res)=>{
    res.redirect('/seller/sale');
})

module.exports=router;