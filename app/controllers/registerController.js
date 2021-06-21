/**
 * FCO LOI User Management
 * Registration Controller
 *
 *
 */

var bcrypt = require('bcryptjs'),
    request = require('request'),
    async = require('async'),
    config = require('../../config/environment'),
    crypto = require('crypto'),
    fs = require('fs'),
    Model = require('../model/models.js'),
    ValidationService = require('../services/ValidationService.js'),  common = require('../../config/common.js'),
    envVariables = common.config(),
    validator = require('validator'),
    dbConnection = require('../sequelize.js');
    moment = require('moment')

    const { Op } = require("sequelize");


var mobilePattern = /^(\+|\d|\(|\#| )(\+|\d|\(| |\-)([0-9]|\(|\)| |\-){5,14}$/;
var phonePattern = /^(\+|\d|\(|\#| )(\+|\d|\(| |\-)([0-9]|\(|\)| |\-){5,14}$/;
    //old pattern /([0-9]|[\-+#() ]){6,}/;

module.exports.usercheck = function(req, res) {
    if(typeof req.body['has-account'] == 'undefined'){
        return res.render('usercheck.ejs', {queryString:req.query, applicationServiceURL: envVariables.applicationServiceURL, error:{'error':'Please select an option.'},error_description: false});
    }
    //copy any querystring
    var queryString = '';
    if (req.body.next){
        queryString = '?next=' + req.body.next;
    }
    if(req.body['has-account'] === "true"){
        return res.redirect('/api/user/sign-in' + queryString);
    }
    else {
        return res.redirect('/api/user/register' + queryString);
    }
};

module.exports.show = function(req, res) {

    if(req.query.from){
        if(req.query.from == 'home'){
            req.session.back_link = envVariables.applicationServiceURL;
        }
        else if (req.query.from == 'start'){
            req.session.back_link = envVariables.applicationServiceURL + 'start';
        }
        else{
            req.session.back_link = envVariables.applicationServiceURL + 'start';
        }
    }


    return res.render('register.ejs', {
        form_values: false,
        erroneousFields:false,
        passwordErrorType: false,
        error_report: false,
        error:false,
        error_description: false,
        email: req.session.email,
        back_link: req.session.back_link,
        applicationServiceURL: envVariables.applicationServiceURL });
};

module.exports.register = function(req, res) {
    req.body.email = req.body.email.toLowerCase();
    req.body.confirm_email = req.body.confirm_email.toLowerCase();


    var patt = new RegExp(envVariables.password_settings.passwordPattern);
    var isemail = require('isemail');
    var emailValid =isemail.validate(req.body.email);

    var messages=[];
    var passwordErrorType=[];
    var errorDescription =[];
    var erroneousFields=[{email:false,confirm_email:false, password:false, confirm_password:false, business_yes_no: false, company_name:false, company_verification_check:false, all_info_correct: false }];

    if (!emailValid){
        errorDescription.push("You have not provided a valid email address \n");
        messages.push({email:"Enter a valid email address \n"});
        erroneousFields[0].email=true;
    }
    if (req.body.email !== req.body.confirm_email ){
        errorDescription.push("Confirm your email address \n");
        messages.push({confirm_email:"Email addresses must match \n"});
        erroneousFields[0].confirm_email=true;
    }

    // check the password against the blacklists
    // location of the password blacklist and phraselist
    var blackList = require('../../config/blacklist.js');
    var phraselist = require('../../config/phraselist.js');
    //return true if password is in the blacklist
    var passwordInBlacklist = validator.isIn(req.body.password, blackList);
    // normalise the password by removing all spaces and converting to lower case
    var normalisedPassword = validator.blacklist(req.body.password, ' ').trim().toLowerCase();
    // check to see if a word in the phraselist appears in the normalised password
    var passwordInPhraselist = false;
    if (new RegExp(phraselist.join("|")).test(normalisedPassword)) {
        passwordInPhraselist = true;
    }

    if (passwordInBlacklist | passwordInPhraselist) {
        errorDescription.push("Change the words in your password - don't include any commonly used words that are easy to guess. \n");
        messages.push({password:"Change the words in your password - don't include any commonly used words that are easy to guess. \n"});
        erroneousFields[0].password=true;
    }

    if (passwordInBlacklist) {
        passwordErrorType.push("blacklist");
    }

    if (passwordInPhraselist) {
        passwordErrorType.push("phraselist");
    }

    if (req.body.password === '') {
        errorDescription.push("You have not provided a valid password \n");
        messages.push({password:"Enter a password \n"});
        errorDescription.push("You must confirm the password \n");
        messages.push({confirm_password:"Confirm your password \n"});
        erroneousFields[0].password=true;
    } else {
        if (req.body.password === '' && req.body.confirm_password === '') {
            messages.push({confirm_password:"Confirm your password \n"});
        } else if(req.body.password != req.body.confirm_password) {
            errorDescription.push("You must confirm the password \n");
            messages.push({password:"Enter a password \n"});
            messages.push({confirm_password:"Passwords did not match \n"});
            erroneousFields[0].confirm_password=true;
        } else {
            if(req.body.password.length < 8) {
                messages.push({password:"Enter a password ensuring it is at least 8 characters long and contains at least 1 lowercase letter, 1 capital letter and 1 number \n"});
                messages.push({confirm_password:"Confirm your password \n"});
            } else if(req.body.password.length > 16) {
                messages.push({password:"Enter a password ensuring it is at most 16 characters long and contains at least 1 lowercase letter, 1 capital letter and 1 number \n"});
                messages.push({confirm_password:"Confirm your password \n"});
            } else if(!patt.test(req.body.password)) {
                messages.push({password:"Your password must be at least 8 characters long and must contain at least 1 lowercase letter, 1 capital letter and 1 number\n"});
                messages.push({confirm_password:"Confirm your password \n"});
            }
        }
        erroneousFields[0].password=true;
    }

    var companyVerification = false;
    if (typeof req.body.company_verification_check !== 'undefined') {
        var companyVerificationArr = req.body.company_verification_check;
        if (companyVerificationArr.indexOf('on') > -1) {
            companyVerification = true;
        } else {
            companyVerification = false;
        }
    }
    req.body.company_verification_check = companyVerification;

    if (typeof req.body.business_yes_no == 'undefined') {
        errorDescription.push("You have not stated if you are registering on behalf of a business \n");
        messages.push({business:"Confirm whether you are registering on behalf of a business \n"});
        erroneousFields[0].business_yes_no=true;
    } else {
        if(req.body.business_yes_no=='Yes'){
            if(req.body.company_name.length < 1){
                errorDescription.push("You have not provided a valid company name \n");
                messages.push({company_name:"Enter a valid company name \n"});
                erroneousFields[0].company_name=true;
            }
            if(req.body.company_verification_check !== true){
                errorDescription.push("Confirm that you represent a business \n");
                messages.push({company_verification_check:"Confirm that you represent a business \n"});
                erroneousFields[0].company_verification_check=true;
            }
        }
    }

    var allInfoCorrectArr = req.body.all_info_correct;
    var allInfoCorrect = false;
    if (allInfoCorrectArr.indexOf('on') > -1) {
        allInfoCorrect = true;
    } else {
        allInfoCorrect = false;
    }

    req.body.all_info_correct = allInfoCorrect;

    if(req.body.all_info_correct !== true){
        errorDescription.push("You have not agreed to the terms and conditions \n");
        messages.push({agree:"Agree to the terms and conditions \n"});
        erroneousFields[0].all_info_correct=true;
    }

    if(messages.length>0){
        return res.render('register.ejs', {
            error:  messages,
            error_description: errorDescription,
            passwordErrorType: passwordErrorType,
            erroneousFields:erroneousFields,
            email: req.session.email,
            all_info_correct: allInfoCorrect,
            form_values: req.body,
            back_link: req.session.back_link ? req.session.back_link : '/api/user/usercheck',
            applicationServiceURL: envVariables.applicationServiceURL
        });
    }




    //check to see if the email address has already been used
    Model.User.findOne({
        where: {
            email: req.body.email
        }
    })
        .then(function (user) {
            if (user) {
                //user already exists
                return res.render('emailconfirm.ejs',{
                    email: req.body.email
                });
            }
            else {
                req.session.email = req.body.email;

                var email = req.body.email;
                var password = req.body.password;
                var confirm_password = req.body.confirm_password;
                var salt = bcrypt.genSaltSync(10);

                /**
                 * If no password/confirmpassword is provided, the hashed instances are set to empty strings
                 * to force validation failure
                 */
                var hashedPassword = password !== null && password !== '' ? bcrypt.hashSync(password, salt) : '';
                var hashedConfirmPassword = confirm_password !== null && confirm_password !== '' ? bcrypt.hashSync(confirm_password, salt) : '';

                // get payment reference for this user account
                dbConnection.query('SELECT * FROM get_next_payment_reference()')
                    .then(function (results) {

                        var paymentReference;

                        if(results[0])
                        {
                            paymentReference = results[0][0].get_next_payment_reference;
                        }
                        else
                        {
                            return next(new Error('failed to retrieve next available payment reference'));
                        }

                        //generate registration token
                        async.waterfall([
                            function(done) {
                                //Create random reset token
                                crypto.randomBytes(20, function(error, buf) {
                                    var token = buf.toString('hex');
                                    //Pass token on to the next function
                                    done(error, token);
                                });
                            },
                            function(token, done) {
                                /**
                                 * Pass in password and hashed password to test if they pass validation
                                 * @type {{email: (*|.where.email|email|.session.user.email|attributes.email|.session.email), first_name: (*|attributes.first_name), last_name: (*|attributes.last_name), address_line1: (*|attributes.address_line1), address_line2: (*|attributes.address_line2), address_line3: (*|attributes.address_line3), town: (*|attributes.town), county: (*|attributes.county), country: (*|attributes.country), postcode: (*|attributes.postcode), telephone: (*|attributes.telephone), salt: *, password: *, confirm_password: *}}
                                 */
                                var expire = new Date();
                                var expiryTime = (60*60*1000*24); //24 hours
                                expire.setTime(expire.getTime()+expiryTime);// now +24 hours

                                var newUser = {
                                    email: email,
                                    password: hashedPassword,
                                    confirm_password: hashedConfirmPassword,
                                    salt:salt,
                                    failedLoginAttemptCount: 0,
                                    accountLocked:false,
                                    passwordExpiry: date_shift(new Date(),envVariables.password_settings.passwordExpiryInDays),
                                    payment_reference: paymentReference,
                                    activationToken: token,
                                    activated: false,
                                    activationTokenExpires:expire,
                                    premiumEnabled: req.body.business_yes_no == 'Yes' ? true : false,
                                    allInfoCorrect:allInfoCorrect,
                                    accountExpiry:date_shift(new Date(),365),
                                    warningSent:false,
                                    expiryConfirmationSent:false
                                };



                                Model.User.create(newUser)
                                    .then(function (created) {
                                        var accountDetails = {
                                            user_id:created.id,
                                            complete: false,
                                            company_name:'N/A',
                                            company_number:0,
                                            feedback_consent: false
                                        };
                                        if(req.body.business_yes_no == 'Yes'){
                                            accountDetails.company_name= req.body.company_name;
                                            //  accountDetails.company_number= req.body.company_number
                                        }
                                        Model.AccountDetails.findOne({where:{user_id:created.id}}).then(function(data){
                                            if(data){
                                                Model.AccountDetails.update(accountDetails,{where:{user_id:created.id}})
                                                    .then(function(){
                                                        done(null, token);
                                                    })
                                                    .catch(function (error) {
                                                        return res.render('register.ejs', {
                                                            error_report: ValidationService.buildErrorsArray(error),
                                                            email: req.session.email,
                                                            form_values: req.body,
                                                            error:false,
                                                            error_description: false,
                                                            passwordErrorType: false,
                                                            applicationServiceURL: envVariables.applicationServiceURL,
                                                            back_link: req.session.back_link ? envVariables.applicationServiceURL + req.session.back_link : '/api/user/usercheck',
                                                            erroneousFields: false
                                                        });
                                                    });
                                            }else{
                                                Model.AccountDetails.create(accountDetails)
                                                    .then(function(){
                                                        done(null, token);
                                                    })
                                                    .catch(function (error) {
                                                        return res.render('register.ejs', {
                                                            error_report: ValidationService.buildErrorsArray(error),
                                                            email: req.session.email,
                                                            form_values: req.body,
                                                            error:false,
                                                            error_description: false,
                                                            passwordErrorType: false,
                                                            back_link: req.session.back_link ? envVariables.applicationServiceURL + req.session.back_link : '/api/user/usercheck',
                                                            applicationServiceURL: envVariables.applicationServiceURL,
                                                            erroneousFields: false
                                                        });
                                                    });
                                            }
                                        });
                                    })
                                    .catch(function(error){
                                        console.log(error);
                                    });
                            },
                            function(token, done){
                                //send the email
                                emailService.emailConfirmation(req.body.email,token);
                                return done(null);

                            }
                        ], function() {
                            req.flash('info', "We've sent you a confirmation email. Click the link in the email to confirm your address.");
                            return res.redirect('/api/user/emailconfirm');

                        });


                    })
                    .catch(function (error) {
                        console.log(error);
                    });


            }
        });
};
module.exports.showAddressSkip =function(req,res){
    return  res.render('initial/address-skip.ejs');
};
module.exports.completeRegistration =function(req,res){

    Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
        Model.AccountDetails.findOne({where:{user_id: user.id}}).then(function(data) {
            if(data) {
                Model.AccountDetails.update({
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    telephone: phonePattern.test(req.body.telephone) ? req.body.telephone : '',
                    feedback_consent: req.body.feedback_consent || '',
                    complete: true
                }, {where: {user_id: user.id}})
                    .then(function () {
                        req.session.initial = true;
                        return  res.render('initial/address-skip.ejs');

                    }).then(function () {

                    if (req.body.mobileNo != '') {

                        var accountManagementObject = {
                            "portalCustomerUpdate": {
                                "userId": "legalisation",
                                "timestamp": (new Date()).getTime().toString(),
                                "portalCustomer": {
                                    "portalCustomerId": user.id,
                                    "forenames": req.body.first_name,
                                    "surname": req.body.last_name,
                                    "primaryTelephone": phonePattern.test(req.body.telephone) ? req.body.telephone : '',
                                    "mobileTelephone": mobilePattern.test(req.body.mobileNo) ? req.body.mobileNo : '',
                                    "eveningTelephone": "",
                                    "email": req.session.email,
                                    "companyName": data.company_name !== 'N/A' ? data.company_name : "",
                                    "companyRegistrationNumber": data.company_number
                                }
                            }
                        };

                    }
                    else {
                        var accountManagementObject = {
                            "portalCustomerUpdate": {
                                "userId": "legalisation",
                                "timestamp": (new Date()).getTime().toString(),
                                "portalCustomer": {
                                    "portalCustomerId": user.id,
                                    "forenames": req.body.first_name,
                                    "surname": req.body.last_name,
                                    "primaryTelephone": phonePattern.test(req.body.telephone) ? req.body.telephone : '',
                                    "mobileTelephone": null,
                                    "eveningTelephone": "",
                                    "email": req.session.email,
                                    "companyName": data.company_name !== 'N/A' ? data.company_name : "",
                                    "companyRegistrationNumber": data.company_number
                                }
                            }
                        };

                    }
                        // calculate HMAC string and encode in base64
                        var objectString = JSON.stringify(accountManagementObject, null, 0);
                        var hash = crypto.createHmac('sha512', config.hmacKey).update(new Buffer.from(objectString, 'utf-8')).digest('hex').toUpperCase();


                        request.post({
                            headers: {
                                "accept": "application/json",
                                "hash": hash,
                                "content-type": "application/json; charset=utf-8",
                                "api-version": "3"
                            },
                            url: config.accountManagementApiUrl,
                            agentOptions: config.certPath ? {
                                cert: config.certPath,
                                key: config.keyPath
                            } : null,
                            json: true,
                            body: accountManagementObject
                        }, function (error, response, body) {
                            if (error) {
                                console.log(JSON.stringify(error));
                            } else if (response.statusCode === 200) {
                                console.log('[ACCOUNT MANAGEMENT] ACCOUNT CREATION SENT TO CASEBOOK SUCCESSFULLY FOR USER_ID ' + user.id);
                            } else {
                                console.error('[ACCOUNT MANAGEMENT] ACCOUNT CREATION FAILED SENDING TO CASEBOOK FOR USER_ID ' + user.id);
                                console.error('response code: ' + response.code);
                                console.error(body);
                            }
                        })
                    })
                    .catch(function (error) {

                        console.log(error);

                        // Custom error array builder for email match confirmation
                        var erroneousFields = [];

                        if (req.param('first_name') === '') {
                            erroneousFields.push('first_name');
                        }
                        if (req.param('last_name') === '') {
                            erroneousFields.push('last_name');
                        }

                        if(typeof (req.param('feedback_consent'))=='undefined') {
                            erroneousFields.push('feedback_consent');
                        }
                        if (req.param('telephone') === ''|| req.param('telephone').length<6 || req.param('telephone').length>25  || !phonePattern.test(req.param('telephone'))) {
                            erroneousFields.push('telephone'); }

                        dataValues = [];
                        dataValues.push({
                            first_name: req.param('first_name') !== '' ? req.param('first_name') : "",
                            last_name: req.param('last_name') !== '' ? req.param('last_name') : "",
                            telephone: req.param('telephone') !== '' ? req.param('telephone') : "",
                            feedback_consent: typeof (req.param('feedback_consent')) !== 'undefined' ? req.param('feedback_consent') : ""
                        });
                        res.render('initial/complete-details', {
                            error_report: ValidationService.validateForm({
                                error: error,
                                erroneousFields: erroneousFields
                            }), form_values: req.body,error:false
                        });
                    });

            }else{
                Model.AccountDetails.create({
                    user_id: user.id,
                    company_name:'N/A',
                    company_number:0,
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    telephone: req.body.telephone,
                    feedback_consent: req.body.feedback_consent,
                    complete: true
                })
                    .then(function () {
                        req.session.initial = true;
                        return res.redirect('/api/user/account');

                    })
                    .catch(function (error) {

                        // Custom error array builder for email match confirmation
                        var erroneousFields = [];

                        if (req.param('first_name') === '') {
                            erroneousFields.push('first_name');
                        }
                        if (req.param('last_name') === '') {
                            erroneousFields.push('last_name');
                        }
                        if (req.param('telephone') === '') {
                            erroneousFields.push('telephone');
                        }
                        dataValues = [];
                        dataValues.push({
                            first_name: req.param('first_name') !== '' ? req.param('first_name') : "",
                            last_name: req.param('last_name') !== '' ? req.param('last_name') : "",
                            telephone: req.param('telephone') !== '' ? req.param('telephone') : ""
                        });
                        res.render('initial/complete-details', {
                            error_report: ValidationService.validateForm({
                                error: error,
                                erroneousFields: erroneousFields
                            }), form_values: req.body,
                            error:false,
                            error_description: false
                        });
                    });
            }

        });
    });

};

module.exports.resendActivationEmail = function(req, res) {
    //generate new registration token
    async.waterfall([
        function(done) {
            //Create new random activation token
            crypto.randomBytes(20, function(error, buf) {
                var token = buf.toString('hex');
                //Pass token on to the next function
                done(error, token);
            });
        },
        function(token, done) {
            //Find User with the password token which has not expired
            Model.User.findOne({
                where: {
                    email: req.body.email,
                    activated: false
                }
            })
                .then(function (user, error) {
                    if (!user) {
                        req.flash('info', "If an account matches " + req.body.email + " we'll send you another confirmation email.");
                        return res.redirect('/api/user/sign-in');
                    }
                    //Update the user with the new token and expiry
                    var expire = new Date();
                    var expiryTime = (60*60*1000*24); //24 hours
                    expire.setTime(expire.getTime()+expiryTime);// now +24 hours

                    Model.User.update({
                        activationToken: token,
                        activated: false,
                        activationTokenExpires: expire
                    }, {
                        where: {email: req.body.email}
                    })
                        .then(function () {
                            done(null, token);
                        }).catch( function(error) {
                        req.flash('info', "If an account matches " + req.body.email + " we'll send you another confirmation email.");
                            return res.redirect('/api/user/sign-in');
                        });
                });
        },
        function(token, done){
            //send the email
            emailService.emailConfirmation(req.body.email,token);
            return done(null);
        }
    ], function() {

        req.flash('info', "If an account matches " + req.body.email + " we'll send you another confirmation email.");
        return res.redirect('/api/user/sign-in');
    });
};

module.exports.activate = function(req, res) {
    async.waterfall([
        function (done) {
            //Find User with the password token which has not expired

            Model.User.findOne({
                where: {
                    activationToken: req.params.token,
                    activationTokenExpires: {
                        [Op.gt]: new Date()
                    }
                }
            })
                .then(function (user, error) {
                    if (!user) {
                        req.flash('error', 'Activation reset token is invalid.  Sign in to send a new one.');
                        return res.redirect('/api/user/sign-in');
                    }
                    //Update the user with the activated flag
                    Model.User.update({
                        activationToken: null,
                        activationTokenExpires: null,
                        activated: true
                    }, {
                        where: {email: user.email}
                    })
                        .then(function () {
                            done(null, user);

                        }).catch( function(error) {
                            done(error, null);
                        });
                });

        }
    ], function () {
        req.flash('info', "You've successfully confirmed your email address. Now you can sign in to your account");
        return res.redirect('/api/user/sign-in');
    });
};

function date_shift (date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
