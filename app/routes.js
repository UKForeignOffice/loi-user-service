var passport = require('passport'),
    async = require('async'),
    crypto = require('crypto'),
    registerController = require('./controllers/registerController.js'),
    passwordController = require('./controllers/passwordController.js'),
    accountController = require('./controllers/accountController.js'),
    addressController = require('./controllers/addressController.js'),
    Model = require('./model/models.js'),
    nextpage;
const { Op } = require("sequelize");
const sessionSettings = JSON.parse(process.env.THESESSION);

module.exports = function(express,envVariables) {
    var router = express.Router();

    var isAuthenticated = function (req, res, next) {
        if (req.isAuthenticated())
            return next();
        req.flash('error', 'You have to be logged in to access the page.');
        res.redirect('/api/user/sign-in');
    };

    var sessionValid = function(req,res,next){
        if(!req.session.passport){
            res.clearCookie('LoggedIn');
            return res.redirect(envVariables.applicationServiceURL+'session-expired?LoggedIn=true');
        }
        else{
            return next();
        }
    };

    router.get('/', function(req, res) {
        res.redirect(envVariables.applicationServiceURL);
    });

    // healtcheck
    router.get('/healthcheck', function(req, res) {
        res.json({message: 'User Service is running'});
    });

    router.get('/usercheck' , function(req,res) {
        return res.render('usercheck.ejs', {queryString:req.query, applicationServiceURL: envVariables.applicationServiceURL, error:false});
    });

    router.post('/usercheck', registerController.usercheck);

    router.get('/register', registerController.show);

    router.post('/register', registerController.register);



    router.get('/sign-in', function(req, res) {
        let sessionCookie = req.cookies[sessionSettings.key];
        if (!sessionCookie) {
            res.redirect(envVariables.applicationServiceURL + 'select-service?newSession=true')
        }
        if (req.query.expired) {
            req.flash('info', 'You have been successfully signed out.');
        }
        //check if there was an activation error
        var error = req.flash('error');
        var error_subitem = '';
        if (error == 'Activation failed') {
            return res.redirect('/api/user/emailconfirm');
        }
        else if (error == 'There was a problem signing in') {
            error_subitem = 'Check your email and password and try again';
        }
        else if (error == 'Account expired') {
            error = 'Your account has expired.';
        }
        if (error.length>0){
            var info_text = error;
            if (info_text == 'There was a problem signing in') {
                info_text = 'The specified email and password combination does not exist';
            }
            console.info('Failed Sign In Attempt: '+ info_text);
        }
        //render page and pass in flash data if any exists
        var back_link = '/api/user/usercheck';

        if(req.query.from) {
            if (req.query.from == 'home') {
                back_link = envVariables.applicationServiceURL;
            }
            else if (req.query.from == 'start') {
                back_link = envVariables.applicationServiceURL + 'start';
            }
            else {
                back_link = envVariables.applicationServiceURL + 'start';
            }
        }

        return res.render('sign-in.ejs', {
            error: error,
            error_subitem: error_subitem,
            signed_out: req.query.expired,
            info: req.flash('info'),
            email: req.session.email,
            back_link: back_link,
            applicationServiceURL: envVariables.applicationServiceURL,
            qs: req.query
        });
    });

    router.post('/sign-in', function(req,res,next){
            req.body.email = req.body.email.toLowerCase();

            req.session.email = req.body.email;

            if(!req.body.email){
                if(!req.body.password) {
                    req.flash('error','Missing email and password');
                }
                else{
                    req.flash('error','Missing email');
                }
            }else if(!req.body.password){
                req.flash('error','Missing password');
            }
            if(!req.body.email || !req.body.password){
                return res.redirect('/api/user/sign-in');
            }

            req.body.username = req.body.email;
            nextpage = req.body.next;
            return next();
        },
        passport.authenticate('local', {
            successRedirect: '/api/user/dashboard',
            failureRedirect: '/api/user/sign-in',
            failureFlash: true
        }));

    router.get('/dashboard', isAuthenticated, function(req, res) {
        // res.cookie('LoggedIn',true,{ httpOnly: true });
        res.cookie('LoggedIn',true,{ maxAge: 1800000, httpOnly: true });

        //set payment reference for user
        Model.User.findOne({where: {email: req.session.email}})
            .then(function (user) {
                if(user.passwordExpiry < new Date()){
                    return  res.redirect('/api/user/set-new-password');
                }

                if(req.query.complete){
                    Model.AccountDetails.update({complete:true},{where:{user_id: user.id}})
                        .then(function(){
                            req.session.initial=false;
                            req.session.payment_reference = user.payment_reference;
                            var queryString = '?';
                            queryString += 'message=' + "Your account is now set up and you can start a new application";

                            return res.redirect(envVariables.applicationServiceURL + 'loading-dashboard' + queryString);
                        });
                }else {
                    Model.AccountDetails.findOne({where: {user_id: user.id}})
                        .then(function (account) {
                            if (account!==null && account.complete) {
                                // set payment reference in session
                                req.session.payment_reference = user.payment_reference;
                                var queryString = '?';
                                if (nextpage) {
                                    queryString += 'name=' + nextpage;
                                }
                                if(req.query.message){
                                    if (nextpage) {
                                        queryString += '&';
                                    }
                                    queryString += 'message=' + req.query.message;
                                }
                                return res.redirect(envVariables.applicationServiceURL + 'loading-dashboard' + queryString);

                            }
                            else {
                                // set payment reference in session
                                req.session.payment_reference = user.payment_reference;
                                return res.redirect('/api/user/complete-details');
                            }
                        });
                }
            });
    });


    router.get('/sign-out', function(req, res) {
        req.session.destroy();
        res.clearCookie('express.sid');
        res.clearCookie('LoggedIn');
        return res.redirect(envVariables.applicationServiceURL + 'select-service?newSession=true&expired=true');
    });

    router.get('/forgot' , function(req,res){
        var locked = typeof(req.query.locked)!='undefined'? JSON.parse(req.query.locked) : false;
        res.render('forgot',{message: req.flash('info'),locked:locked});
    });

    router.post('/forgot', passwordController.forgotPassword);

    router.get('/session-expired' , function(req,res){
        res.render('session-expired',{ startNewApplicationUrl: envVariables.applicationServiceURL});
    });

    router.get('/reset/:token', function(req, res) {
        Model.User.findOne({where:{ resetPasswordToken: req.params.token, resetPasswordExpires: { [Op.gt]: new Date()} }})
            .then( function(user) {
                if (!user) {
                    req.flash('info', 'The link for resetting your password has expired. Enter your email to get sent a new link.');
                    console.info('Password reset requested. Reset link expired.');
                    return res.render('forgot',{message: req.flash('info'),locked:false});
                }
                return res.render('reset', {resetPasswordToken : req.params.token, error:false});
            });
    });

    router.post('/reset/:token', passwordController.resetPassword);
    router.get('/set-new-password',sessionValid,function(req,res){res.render('set-new-password.ejs', {error:  false});
    });
    router.post('/set-new-password', passwordController.resetPassword);

    router.get('/activate/:token', registerController.activate);

    router.get('/emailconfirm' , function(req,res) {
        return res.render('emailconfirm.ejs', { email:req.session.email, applicationServiceURL: envVariables.applicationServiceURL, info:req.flash('info') });
    });

    router.post('/resend-confirmation', registerController.resendActivationEmail);


    router.get('/complete-details',sessionValid,function(req,res){
        res.render('initial/complete-details',{error_report:false,form_values:false,error:req.flash('error')});
    });
    router.get('/complete-registration',sessionValid, registerController.showAddressSkip);
    router.post('/complete-registration',sessionValid, registerController.completeRegistration);

    router.get('/account',sessionValid,accountController.showAccount);
    router.get('/change-details',sessionValid,accountController.showChangeDetails);
    router.post('/change-details',sessionValid,accountController.changeDetails);
    router.get('/change-password',sessionValid,accountController.showChangePassword);
    router.post('/change-password',sessionValid,accountController.changePassword);
    router.get('/change-company-details',sessionValid,accountController.showChangeCompanyDetails);
    router.post('/change-company-details',sessionValid,accountController.changeCompanyDetails);
    router.get('/upgrade-account',sessionValid,accountController.showUpgradeAccount);
    router.post('/upgrade-account',sessionValid,accountController.upgradeAccount);
    router.get('/change-email',sessionValid,accountController.changeEmail);

    router.get('/addresses',sessionValid,accountController.showAddresses);

    router.get('/add-address',sessionValid, addressController.showUKQuestion);
    router.post('/add-address-uk',sessionValid,addressController.submitUKQuestion);
    router.get('/add-address-uk',sessionValid,addressController.showPostcodeLookup);

    router.get('/find-your-address',sessionValid,addressController.findAddress);
    router.post('/find-your-address',sessionValid,addressController.findAddress);

    router.post('/ajax-find-your-address',sessionValid,addressController.ajaxFindPostcode);
    router.post('/ajax-select-your-address',sessionValid,addressController.ajaxSelectAddress);

    router.get('/select-your-address',sessionValid,addressController.selectAddress); //Redirects back to postcode search
    router.post('/select-your-address',sessionValid,addressController.selectAddress);

    router.get('/your-address-manual',sessionValid,addressController.showManualAddress);
    router.post('/save-address',sessionValid,addressController.saveAddress);

    router.get('/edit-address',sessionValid,addressController.showEditAddress);
    router.post('/edit-address',sessionValid,addressController.editAddress);
    router.get('/delete-address',sessionValid,addressController.deleteAddress);

    return router;
};
