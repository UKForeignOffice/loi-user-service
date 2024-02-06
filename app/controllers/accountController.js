/**
 * FCO LOI User Management
 * Registration Controller
 *
 *
 */

const emailService = require("../services/emailService");
const config = require('../../config/environment');
const fs = require('fs');
const Model = require('../model/models.js');
const ValidationService = require('../services/ValidationService.js'),  common = require('../../config/common.js');
const envVariables = common.config();
const request = require('request');
const crypto = require('crypto');
const moment = require("moment");
const oneTimePasscodeService = require("../services/oneTimePasscodeService");
const HelperService = require("../services/HelperService");

var mobilePattern = /^(\+|\d|\(|\#| )(\+|\d|\(| |\-)([0-9]|\(|\)| |\-){5,14}$/;
var phonePattern = /^(\+|\d|\(|\#| )(\+|\d|\(| |\-)([0-9]|\(|\)| |\-){5,14}$/;


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

async function sendToOrbit(accountManagementObject, user) {
    try {
        const edmsManagePortalCustomerUrl = config.edmsHost + '/api/v1/managePortalCustomer';
        const edmsBearerToken = await HelperService.getEdmsAccessToken();
        const startTime = new Date();

        request.post(
            {
                headers: {
                    'content-type': 'application/json',
                    Authorization: `Bearer ${edmsBearerToken}`,
                },
                url: edmsManagePortalCustomerUrl,
                json: true,
                body: accountManagementObject,
            },
            function (error, response, body) {
                const endTime = new Date();
                const elapsedTime = endTime - startTime;

                if (error) {
                    console.log(JSON.stringify(error));
                } else if (response.statusCode === 200) {
                    console.log(
                        '[ACCOUNT MANAGEMENT] ACCOUNT UPDATE SENT TO ORBIT SUCCESSFULLY FOR USER_ID ' +
                        user.id
                    );
                } else {
                    console.error(
                        '[ACCOUNT MANAGEMENT] ACCOUNT UPDATE FAILED SENDING TO ORBIT FOR USER_ID ' +
                        user.id
                    );
                    console.error('response code: ' + response.code);
                    console.error(body);
                }

                console.log(`Orbit account management request response time: ${elapsedTime}ms`);
            }
        );
    } catch (error) {
        console.error(`sendToOrbit: ${error}`);
    }
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

            let mfaPreference = user.mfaPreference
            let disableMobileNumberEditing = (mfaPreference === 'SMS')

            return res.render('account_pages/change-details.ejs', {
                error_report:false,
                form_values:account,
                url:envVariables,
                disableMobileNumberEditing: disableMobileNumberEditing
            });
        });
    });
};

module.exports.changeDetails = function(req, res) {

    Model.User.findOne({where:{email:req.session.email}})
        .then(function (user) {
            Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(data){

                let mfaPreference = user.mfaPreference
                let disableMobileNumberEditing = (mfaPreference === 'SMS')

                let accountDetails = {
                    first_name: req.body.first_name,
                    last_name: req.body.last_name,
                    telephone: phonePattern.test(req.body.telephone) ? req.body.telephone : '',
                    mobileNo: (req.body.mobileNo !== '') ? mobilePattern.test(req.body.mobileNo) ? req.body.mobileNo : null : null,
                    feedback_consent: req.body.feedback_consent || ''
                };

                if(data){

                    let companyName = (user.premiumServiceEnabled) ? data.company_name : ""

                    if (user.mfaPreference === 'SMS') {
                        accountDetails.mobileNo = data.mobileNo
                    }

                    Model.AccountDetails.update(accountDetails,{where:{user_id:user.id}})
                        .then(function(){
                            return res.redirect('/api/user/account');
                        })
                        .then(function () {

                            var accountManagementObject = {
                                "portalCustomerUpdate": {
                                    "userId": "legalisation",
                                    "timestamp": (new Date()).getTime().toString(),
                                    "portalCustomer": {
                                        "portalCustomerId": user.id,
                                        "forenames": accountDetails.first_name,
                                        "surname": accountDetails.last_name,
                                        "primaryTelephone": accountDetails.telephone,
                                        "mobileTelephone": accountDetails.mobileNo,
                                        "eveningTelephone": "",
                                        "email": req.session.email,
                                        "companyName": companyName,
                                        "companyRegistrationNumber": ''
                                    }
                                }
                            }

                            // calculate HMAC string and encode in base64
                            var objectString = JSON.stringify(accountManagementObject, null, 0);

                            config.live_variables.caseManagementSystem === 'ORBIT' ?
                                sendToOrbit(accountManagementObject, user) :
                                sendToCasebook(objectString, accountManagementObject, user);

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
                            if (req.param('mobileNo') !== '' && typeof(req.param('mobileNo')) !== 'undefined') {
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
                                error_report:ValidationService.validateForm({error:error,erroneousFields: erroneousFields}),
                                form_values:req.body,
                                url:envVariables,
                                disableMobileNumberEditing: disableMobileNumberEditing
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
                            if(typeof (req.param('feedback_consent'))==='undefined') {
                                erroneousFields.push('feedback_consent');
                            }
                            if (req.param('telephone') === ''|| req.param('telephone').length<6 || req.param('telephone').length>25) { erroneousFields.push('telephone'); }
                            if (req.param('mobileNo') !== '' && typeof(req.param('mobileNo')) !== 'undefined') {
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
                                error_report:ValidationService.validateForm({error:error,erroneousFields: erroneousFields}),
                                form_values:req.body,
                                url:envVariables,
                                disableMobileNumberEditing: disableMobileNumberEditing
                            });
                        });
                }
            });
        });

};

module.exports.showChangePassword = function(req, res) {
    return res.render('account_pages/change-password.ejs', {error:false, url:envVariables});
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

module.exports.showChangeMfa = function(req, res) {
    Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
        Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(account){
            return res.render('account_pages/change-mfa.ejs', {
                error:false,
                errorsArray: null,
                url:envVariables,
                mfaPreference: user.mfaPreference,
                mobileNo: account.mobileNo
            });
        });
    });
};

module.exports.changeMfa = async function(req, res) {

    Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
        Model.AccountDetails.findOne({where:{user_id:user.id}}).then(async function(account){

            let mfaPreference = req.body['mfaPreference']
            let mobileNoFromForm = req.body['mobileNo']
            let mobileNoFromDB = account.mobileNo
            let mobileNoDiffers = (mobileNoFromForm !== mobileNoFromDB)

            let errorsArray = [];

            // Don't need to change anything if the user is trying to
            // select the MFA method they are already using
            if ((mfaPreference === 'Email' && user.mfaPreference === 'Email') || (mfaPreference === 'SMS' && user.mfaPreference === 'SMS' && !mobileNoDiffers)){
                return res.redirect('/api/user/account');
            }

            if (mfaPreference === 'Email') {
                Model.User.update({mfaPreference: mfaPreference}, {where: {email: req.session.email}}).then(function(){
                    req.flash('info', 'Your MFA preference has been updated to Email.');
                    return res.redirect('/api/user/account');
                })
            } else {
                let validMobile = mobilePattern.test(mobileNoFromForm) ? mobileNoFromForm : false

                if (validMobile !== false) {

                    // one time passcodes expire 10 mins after being issued
                    let oneTimePasscodeExists = await oneTimePasscodeService.checkIfOneTimePasscodeExists(user.id)

                    if (oneTimePasscodeExists) {

                        // if the one time passcode for the user is old we need to
                        // delete it and generate a new one
                        if (moment(Date.parse(oneTimePasscodeExists.passcode_expiry)).isBefore(Date.now())) {
                            await oneTimePasscodeService.deleteOneTimePasscode(user.id)
                            let one_time_passcode = await oneTimePasscodeService.generateOneTimePasscode()
                            await oneTimePasscodeService.storeNewOneTimePasscode(user.id, one_time_passcode)
                            await emailService.sendOneTimePasscodeSMS(one_time_passcode, validMobile, user.id)
                        }

                    } else {

                        let one_time_passcode = await oneTimePasscodeService.generateOneTimePasscode()
                        await oneTimePasscodeService.storeNewOneTimePasscode(req.user.id, one_time_passcode)
                        await emailService.sendOneTimePasscodeSMS(one_time_passcode, validMobile, req.user.id)

                    }

                    return res.render('account_pages/validate-sms-totp', {
                        error:false,
                        errorsArray: null,
                        back_link: '/api/user/change-mfa',
                        info: req.flash('info'),
                        mobileNo: validMobile
                    });

                } else {
                    errorsArray.push({
                        fieldName: 'mobileNo',
                        fieldError: 'Enter a telephone number, like 01632 960 001, 07700 900 982 or +44 808 157 0192'
                    })
                    return res.render('account_pages/change-mfa.ejs', {
                        error: true,
                        errorsArray: errorsArray,
                        url:envVariables,
                        mfaPreference: user.mfaPreference,
                        mobileNo: account.mobileNo
                    });
                }
            }
        })
    })

};

module.exports.showValidateSMS = async function(req, res) {

    let user_id = req.session.passport.user
    let mobileNoFromForm = req.body['mobileNo']
    let accountData = await oneTimePasscodeService.getAccountData(user_id)

    if (req.query.resendPasscode === 'true') {

        let one_time_passcode = await oneTimePasscodeService.generateOneTimePasscode()
        await oneTimePasscodeService.deleteOneTimePasscode(user_id)
        await oneTimePasscodeService.storeNewOneTimePasscode(user_id, one_time_passcode)
        await emailService.sendOneTimePasscodeSMS(one_time_passcode, accountData.mobileNo, user_id)
        req.flash('info', 'We have sent you another passcode via SMS.')
        res.render('account_pages/validate-sms-totp', {
            error: false,
            errorsArray: null,
            back_link: '/api/user/change-mfa',
            info: req.flash('info'),
            mobileNo: mobileNoFromForm
        });

    } else {

        res.render('account_pages/validate-sms-totp', {
            error: false,
            errorsArray: null,
            back_link: '/api/user/change-mfa',
            info: req.flash('info'),
            mobileNo: mobileNoFromForm
        });

    }

};

module.exports.validateSMS = async function (req, res) {

    let passcode = req.body.passcode
    let mobileNoFromForm = req.body['mobileNo']
    let user_id = req.session.passport.user
    let errorsArray = [];

    async function validateFormInput(passcode) {

        if (passcode.length === 0) {
            errorsArray.push({
                fieldName: 'passcode',
                fieldError: 'Please enter a passcode'
            })
        } else if (passcode.length !== 6) {
            errorsArray.push({
                fieldName: 'passcode',
                fieldError: 'Please enter a 6 digit passcode'
            })
        }

        return errorsArray.length === 0;

    }

    function sendAccountUpdateToCasebook() {
        Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
            Model.AccountDetails.findOne({where: {user_id: user.id}}).then(function (data) {
                let accountManagementObject = {
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
                            "companyName": data.company_name,
                            "companyRegistrationNumber": data.company_number
                        }
                    }
                };



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
                        console.log('[ACCOUNT MANAGEMENT] ACCOUNT UPDATE SENT TO CASEBOOK SUCCESSFULLY FOR USER_ID ' + user.id);
                    } else {
                        console.error('[ACCOUNT MANAGEMENT] ACCOUNT UPDATE FAILED SENDING TO CASEBOOK FOR USER_ID ' + user.id);
                        console.error('response code: ' + response.code);
                        console.error(body);
                    }
                });
            });
        });
    }

    let noErrorsPresent = await validateFormInput(passcode)

    if (noErrorsPresent) {

        let verificationIsSuccessful = await oneTimePasscodeService.verifyUser(user_id, passcode)
        if (verificationIsSuccessful) {
            await oneTimePasscodeService.deleteOneTimePasscode(user_id)
            await oneTimePasscodeService.updateMfaPreferenceToSMS(user_id)
            await oneTimePasscodeService.updateAccountMobileNumber(user_id, mobileNoFromForm)
            sendAccountUpdateToCasebook()
            req.flash('info', 'Your MFA preference has been updated to SMS.');
            res.redirect('/api/user/account')
        } else {
            errorsArray.push({
                fieldName: 'passcode',
                fieldError: 'The passcode you entered was incorrect'
            })

            return res.render('account_pages/validate-sms-totp', {
                error:true,
                errorsArray: errorsArray,
                back_link: '/api/user/change-mfa',
                info: req.flash('info'),
                mobileNo: mobileNoFromForm
            });
        }

    } else {

        return res.render('account_pages/validate-sms-totp', {
            error: true,
            errorsArray: errorsArray,
            info: req.flash('info'),
            back_link: '/api/user/change-mfa',
            mobileNo: mobileNoFromForm
        })
    }

};

module.exports.showChangeCompanyDetails = function(req, res) {
    Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
        Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(account){
            return res.render('account_pages/change-company-details.ejs', {error_report:false,form_values:account, url:envVariables});
        });
    });
};

module.exports.changeCompanyDetails = function(req, res) {
    var accountDetails = {
        company_name: req.body.company_name
    };

    Model.User.findOne({where:{email:req.session.email}})
        .then(function (user) {
            Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(data){
                if(data){
                    Model.AccountDetails.update(accountDetails,{where:{user_id:user.id}})
                        .then(function(){

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
                                        "companyRegistrationNumber": data.company_number
                                    }
                                }
                            };

                            var objectString = JSON.stringify(accountManagementObject, null, 0);

                            config.live_variables.caseManagementSystem === 'ORBIT' ?
                                sendToOrbit(accountManagementObject, user) :
                                sendToCasebook(objectString, accountManagementObject, user);


                            return res.redirect('/api/user/account');
                        })
                        .catch(function (error) {
                            // Custom error array builder for email match confirmation
                            var erroneousFields = [];

                            if (req.param('company_name') === '') { erroneousFields.push('company_name'); }

                            dataValues = [];
                            dataValues.push({
                                company_name: req.param('company_name') !== '' ? req.param('company_name') : ''
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