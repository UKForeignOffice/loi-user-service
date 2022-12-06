/**
 * FCO LOI User Management
 * Registration Controller
 *
 *
 */


const config = require('../../config/environment'),
    fs = require('fs'),
    Model = require('../model/models.js'),
    ValidationService = require('../services/ValidationService.js'),  common = require('../../config/common.js'),
    envVariables = common.config(),
    request = require('request'),
    crypto = require('crypto'),
    async = require('async');

var mobilePattern = /^(\+|\d|\(|\#| )(\+|\d|\(| |\-)([0-9]|\(|\)| |\-){5,14}$/;
var phonePattern = /^(\+|\d|\(|\#| )(\+|\d|\(| |\-)([0-9]|\(|\)| |\-){5,14}$/;
    //old pattern /([0-9]|[\-+#() ]){6,}/;

function sendToCasebook(objectString, accountManagementObject, user) {

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
            console.log('[ACCOUNT MANAGEMENT] ACCOUNT UPDATE SENT TO CASEBOOK SUCCESSFULLY FOR USER_ID ' + user.id);
        } else {
            console.error('[ACCOUNT MANAGEMENT] ACCOUNT UPDATE FAILED SENDING TO CASEBOOK FOR USER_ID ' + user.id);
            console.error('response code: ' + response.code);
            console.error(body);
        }
    })

}

function sendToOrbit(accountManagementObject, user) {
    var edmsManagePortalCustomerUrl = config.edmsHost + '/api/v1/managePortalCustomer'
    var edmsBearerToken = config.edmsBearerToken

    request.post({
        headers: {
            'content-type': 'application/json',
            'Authorization': `Bearer ${edmsBearerToken}`
        },
        url: edmsManagePortalCustomerUrl,
        json: true,
        body: accountManagementObject
    }, function (error, response, body) {
        if (error) {
            console.log(JSON.stringify(error));
        } else if (response.statusCode === 200) {
            console.log('[ACCOUNT MANAGEMENT] ACCOUNT UPDATE SENT TO ORBIT SUCCESSFULLY FOR USER_ID ' + user.id);
        } else {
            console.error('[ACCOUNT MANAGEMENT] ACCOUNT UPDATE FAILED SENDING TO ORBIT FOR USER_ID ' + user.id);
            console.error('response code: ' + response.code);
            console.error(body);
        }
    })
}

module.exports.showAccount = function(req, res) {
    Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
        Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(account){
            if(account!==null) {
                return res.render('account_pages/account.ejs', {
                    user: user,
                    account: account,
                    url: envVariables,
                    info: req.flash('info'),
                    company_info: req.flash('company_info')
                });
            }else{
                return res.redirect('/api/user/complete-details');
            }
        });
    });
};

module.exports.showAddresses = function(req, res) {
    if(req.session.email) {
        Model.User.findOne({where: {email: req.session.email}}).then(function (user) {
            Model.AccountDetails.findOne({where: {user_id: user.id}}).then(function (account) {
                Model.SavedAddress.findAll({where: {user_id: user.id}, order: [['id', 'ASC']]}).then(function (addresses) {
                    return res.render('account_pages/addresses.ejs', {
                        user: user,
                        account: account,
                        url: envVariables,
                        addresses: addresses,
                        info: req.flash('info')
                    });
                });
            });
        });
    }
};

module.exports.showChangeDetails = function(req, res) {
    Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
        Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(account){
            return res.render('account_pages/change-details.ejs', {error_report:false,form_values:account, url:envVariables});
        });
    });
};

module.exports.showChangePassword = function(req, res) {
    return res.render('account_pages/change-password.ejs', {error:false, url:envVariables});
};

module.exports.changeDetails = function(req, res) {
    if (req.body.mobileNo != '') {
        var accountDetails = {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            telephone: phonePattern.test(req.body.telephone) ? req.body.telephone : '',
            mobileNo: mobilePattern.test(req.body.mobileNo) ? req.body.mobileNo : '',

            feedback_consent: req.body.feedback_consent || ''
        };
    }
    else{
        var accountDetails = {
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            telephone: phonePattern.test(req.body.telephone) ? req.body.telephone : '',
            mobileNo: null,

            feedback_consent: req.body.feedback_consent || ''
        };
    }

    Model.User.findOne({where:{email:req.session.email}})
        .then(function (user) {
            Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(data){
                if(data){
                    Model.AccountDetails.update(accountDetails,{where:{user_id:user.id}})
                        .then(function(){
                            return res.redirect('/api/user/account');
                        })
                        .then(function () {

                            let companyName = (user.premiumServiceEnabled) ? data.company_name : ""

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
                                            "companyName": companyName,
                                            "companyRegistrationNumber": ''
                                        }
                                    }
                                };
                            }
                            else{
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
                                            "companyName": companyName,
                                            "companyRegistrationNumber": ''
                                        }
                                    }
                                };
                            }

                        // calculate HMAC string and encode in base64
                        var objectString = JSON.stringify(accountManagementObject, null, 0);
                        sendToCasebook(objectString, accountManagementObject, user)
                        sendToOrbit(accountManagementObject, user)

                    })
                        .catch(function (error) {
                            console.log(error);
                            // Custom error array builder for email match confirmation
                            var erroneousFields = [];

                            if (req.param('first_name') === '') { erroneousFields.push('first_name'); }
                            if (req.param('last_name') === '') { erroneousFields.push('last_name'); }
                            if(typeof (req.param('feedback_consent'))=='undefined') {
                                erroneousFields.push('feedback_consent');
                            }
                            if (req.param('telephone') === ''|| req.param('telephone').length<6 || req.param('telephone').length>25  ||  !phonePattern.test(req.param('telephone'))) { erroneousFields.push('telephone'); }
                            if (req.param('mobileNo') !== "" && typeof(req.param('mobileNo')) != 'undefined') {
                                if (req.param('mobileNo') === '' || req.param('mobileNo').length < 6 || req.param('mobileNo').length > 25 || !mobilePattern.test(req.param('mobileNo'))) {
                                    erroneousFields.push('mobileNo');
                                }
                            }

                            dataValues = [];
                            dataValues.push({
                                first_name: req.param('first_name') !== '' ? req.param('first_name') : "",
                                last_name: req.param('last_name') !== '' ? req.param('last_name') : "",
                                telephone: req.param('telephone') !== '' ? req.param('telephone') : "",
                                mobileNo: req.param('mobileNo') !== '' ? req.param('mobileNo') : "",
                                feedback_consent: typeof (req.param('feedback_consent')) !== 'undefined' ? req.param('feedback_consent') : ""
                            });
                            return res.render('account_pages/change-details.ejs', {
                                error_report:ValidationService.validateForm({error:error,erroneousFields: erroneousFields}), form_values:req.body, url:envVariables
                            });
                        });
                }else{
                    Model.AccountDetails.create(accountDetails)
                        .then(function(){
                            return res.redirect('/api/user/account');
                        })
                        .catch(function (error) {
                            // Custom error array builder for email match confirmation
                            var erroneousFields = [];

                            if (req.param('first_name') === '') { erroneousFields.push('first_name'); }
                            if (req.param('last_name') === '') { erroneousFields.push('last_name'); }
                            if(typeof (req.param('feedback_consent'))=='undefined') {
                                erroneousFields.push('feedback_consent');
                            }
                            if (req.param('telephone') === ''|| req.param('telephone').length<6 || req.param('telephone').length>25) { erroneousFields.push('telephone'); }
                            if (req.param('mobileNo') !== "" && typeof(req.param('mobileNo')) != 'undefined') {
                                if (req.param('mobileNo') === '' || req.param('mobileNo').length < 6 || req.param('mobileNo').length > 25) {
                                    erroneousFields.push('mobileNo');
                                }
                            }

                            dataValues = [];
                            dataValues.push({
                                first_name: req.param('first_name') !== '' ? req.param('first_name') : "",
                                last_name: req.param('last_name') !== '' ? req.param('last_name') : "",
                                telephone: req.param('telephone') !== '' ? req.param('telephone') : "",
                                mobileNo: req.param('mobileNo') !== '' ? req.param('mobileNo') : "",
                                feedback_consent: typeof (req.param('feedback_consent')) !== 'undefined' ? req.param('feedback_consent') : ""
                            });
                            return res.render('account_pages/change-details.ejs', {
                                error_report:ValidationService.validateForm({error:error,erroneousFields: erroneousFields}), form_values:req.body, url:envVariables
                            });
                        });
                }
            });
        });

};

module.exports.changePassword = function(req,res){
    crypto.randomBytes(20, function(error, buf) {
        var token = buf.toString('hex');
        var expire = new Date();
        var expiryTime = (60*60*1000); //1 hour
        expire.setTime(expire.getTime()+expiryTime);// now +1 hour

        //Associate token and the token expiry with user
        Model.User.update({
            resetPasswordToken: token,
            resetPasswordExpires: expire
        }, {
            where: {
                email: req.session.email
            }})
            .then(function(){
                emailService.resetPassword(req.session.email,token);
                req.flash('info', "We've sent you an email with instructions on how to reset your password.");
                return res.redirect('/api/user/account');
            });
    });
};

module.exports.showChangeCompanyDetails = function(req, res) {
    Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
        Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(account){
            return res.render('account_pages/change-company-details.ejs', {error_report:false,form_values:account, url:envVariables});
        });
    });
};

module.exports.changeCompanyDetails = function(req, res) {
    var accountDetails ={
        company_name: req.body.company_name
    };

    Model.User.findOne({where:{email:req.session.email}})
        .then(function (user) {
            Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(data){
                if(data){
                    Model.AccountDetails.update(accountDetails,{where:{user_id:user.id}})
                        .then(function(){
                            if (req.body.mobileNo != '') {
                                var accountManagementObject = {
                                    "portalCustomerUpdate": {
                                        "userId": "legalisation",
                                        "timestamp": (new Date()).getTime().toString(),
                                        "portalCustomer": {
                                            "portalCustomerId": user.id,
                                            "forenames": data.first_name,
                                            "surname": data.last_name,
                                            "primaryTelephone": data.telephone,
                                            "mobileTelephone": data.mobileNo,
                                            "eveningTelephone": "",
                                            "email": req.session.email,
                                            "companyName": req.body.company_name,
                                            "companyRegistrationNumber": ''
                                        }
                                    }
                                };
                            }
                            else{
                                var accountManagementObject = {
                                    "portalCustomerUpdate": {
                                        "userId": "legalisation",
                                        "timestamp": (new Date()).getTime().toString(),
                                        "portalCustomer": {
                                            "portalCustomerId": user.id,
                                            "forenames": data.first_name,
                                            "surname": data.last_name,
                                            "primaryTelephone": data.telephone,
                                            "mobileTelephone": "",
                                            "eveningTelephone": "",
                                            "email": req.session.email,
                                            "companyName": req.body.company_name,
                                            "companyRegistrationNumber": ''
                                        }
                                    }
                                };
                            }

                            var objectString = JSON.stringify(accountManagementObject, null, 0);


                            sendToCasebook(objectString, accountManagementObject, user)
                            sendToOrbit(accountManagementObject, user)
                            return res.redirect('/api/user/account');
                        })
                        .catch(function (error) {
                            // Custom error array builder for email match confirmation
                            var erroneousFields = [];

                            if (req.param('company_name') === '') { erroneousFields.push('company_name'); }


                            dataValues = [];
                            dataValues.push({
                                company_name: req.param('company_name') !== '' ? req.param('company_name') : ""
                            });
                            return res.render('account_pages/change-company-details.ejs', {
                                error_report:ValidationService.validateForm({error:error,erroneousFields: erroneousFields}), form_values:req.body, url:envVariables
                            });
                        });
                }else{
                    Model.AccountDetails.create(accountDetails)
                        .then(function(){
                            return res.redirect('/api/user/account');
                        })
                        .catch(function (error) {
                            // Custom error array builder for email match confirmation
                            var erroneousFields = [];

                            if (req.param('company_name') === '') { erroneousFields.push('company_name'); }
                            dataValues = [];
                            dataValues.push({
                                company_name: req.param('company_name') !== '' ? req.param('company_name') : ""
                            });
                            return res.render('account_pages/change-company-details.ejs', {
                                error_report:ValidationService.validateForm({error:error,erroneousFields: erroneousFields}), form_values:req.body, url:envVariables
                            });
                        });
                }
            });
        });

};


module.exports.changeEmail = function(req, res) {
    Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
            return res.render('account_pages/change-email.ejs', {url:envVariables});
        });
};