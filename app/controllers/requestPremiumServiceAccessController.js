const Model = require("../model/models");
const crypto = require("crypto");
const common = require('../../config/common.js');
const emailService = require("../services/emailService");
const envVariables = common.config();
const request = require('request');
const config = require("../../config/environment");

module.exports.showRequestPremiumServiceAccess = async function(req, res) {

    try {

        if(req.session.email) {

            let userAccount = await findUserAccount()
            let userAccountDetails = await findUserAccountDetails(userAccount)
            renderPage(userAccount, userAccountDetails)


            async function findUserAccount () {
                try {

                    return await Model.User.findOne({where: {email: req.session.email}})

                } catch (error) {
                    console.log('showRequestPremiumServiceAccess.findUserAccount', error)
                }
            }

            async function findUserAccountDetails (user) {
                try {

                    return await Model.AccountDetails.findOne({where: {user_id: user.id}})

                } catch (error) {
                    console.log('showRequestPremiumServiceAccess.findUserAccountDetails', error)
                }
            }

            function renderPage (user, account) {
                try {

                    let back_link = '/api/user/account'
                    if (req.query.from) {
                        if (req.query.from === 'start') {
                            back_link = envVariables.applicationServiceURL + 'select-service'
                        }
                    }

                    return res.render('account_pages/request-premium-service-access.ejs', {
                        user: user,
                        account: account,
                        url: envVariables,
                        error: false,
                        errorsArray: [],
                        back_link: back_link,
                        form_values: false
                    });

                } catch (error) {
                    console.log('showRequestPremiumServiceAccess.renderPage', error)
                }
            }

        }

    } catch (error) {
        console.log('requestPremiumAccessController.showRequestPremiumServiceAccess', error)
    }


};

module.exports.requestPremiumServiceAccess = async function(req, res) {

    try {

        if(req.session.email) {

            let emailData = {
                userEmail: req.session['email'],
                companyName: req.body['company-name'],
                companiesHouseNumber: req.body['companies-house-number'],
                businessArea: req.body['business-area'],
                justification: req.body['justification'],
                token: '',
                userID: ''
            };

            let userAccount = await findUserAccount()
            let userAccountDetails = await findUserAccountDetails(userAccount)
            let noErrorsPresent = await validateFormInput(emailData, userAccount, userAccountDetails)

            if (noErrorsPresent) {

                let token = await generateUserToken()
                token = token.toString('hex')
                emailData['token'] = token;
                await assignTokenToUser(userAccount, token)
                await updateCompanyName(userAccount)
                emailData['userID'] = userAccount.id;
                await emailService.requestPremiumAccess(emailData)
                redirectToSelectServicePage()

            }

            async function findUserAccount () {
                try {

                    return await Model.User.findOne({where: {email: req.session.email}})

                } catch (error) {
                    console.log('requestPremiumServiceAccess.findUserAccount', error)
                }
            }

            async function findUserAccountDetails (user) {
                try {

                    return await Model.AccountDetails.findOne({where: {user_id: user.id}})

                } catch (error) {
                    console.log('showRequestPremiumServiceAccess.findUserAccountDetails', error)
                }
            }

            async function assignTokenToUser (user, token) {
                try {

                    // track the number of times user requests access
                    let attempts = user.noOfPremiumRequestAttempts
                    attempts = attempts + 1

                    return await Model.User.update(
                        {
                            premiumUpgradeToken: token,
                            noOfPremiumRequestAttempts: attempts
                        },
                        {
                            where: {
                                email: user.email
                            }
                        })

                } catch (error) {
                    console.log('requestPremiumServiceAccess.assignTokenToUser', error)
                }
            }

            async function updateCompanyName (user) {
                try {

                    return await Model.AccountDetails.update(
                        {
                            company_name: req.body['company-name']
                        },
                        {
                            where: {
                                user_id: user.id
                            }
                        })

                } catch (error) {
                    console.log('requestPremiumServiceAccess.updateCompanyName', error)
                }
            }

            async function generateUserToken() {
                try {

                    return await crypto.randomBytes(20)


                } catch (error) {
                    console.log('requestPremiumServiceAccess.generateUserToken', error)
                }
            }

            async function validateFormInput (emailData, user, account) {
                try {

                    let errorsArray = [];

                    if (emailData.companyName === '') {
                        errorsArray.push({
                            fieldName: 'company-name',
                            fieldError: 'Company name cannot be empty'
                        })
                    }

                    if (emailData.companiesHouseNumber.length > 0 && emailData.companiesHouseNumber.length !== 8) {
                        errorsArray.push({
                            fieldName: 'companies-house-number',
                            fieldError: 'Please enter a valid Companies House number'
                        })
                    }

                    if (emailData.businessArea === '' || emailData.businessArea === 'Please select') {
                        errorsArray.push({
                            fieldName: 'business-area',
                            fieldError: 'Please select a business area'
                        })
                    }

                    if (emailData.justification === '') {
                        errorsArray.push({
                            fieldName: 'justification',
                            fieldError: 'Justification cannot be empty'
                        })
                    }

                    // If the user has already applied 3 times then throw a validation error
                    if (user.noOfPremiumRequestAttempts >= 3) {
                        errorsArray.push({
                            fieldName: '#',
                            fieldError: 'You have exceeded the number of times you can apply for a premium account'
                        })
                    }

                    if (errorsArray.length !== 0) {

                        renderPage(user, account, errorsArray)

                    } else return true

                } catch (error) {
                    console.log('requestPremiumServiceAccess.validateFormInput', error)
                }

            }

            function renderPage (user, account, errorsArray) {
                try {

                    return res.render('account_pages/request-premium-service-access.ejs', {
                        user: user,
                        account: account,
                        url: envVariables,
                        error: true,
                        errorsArray: errorsArray,
                        back_link: envVariables.applicationServiceURL + 'select-service',
                        form_values: req.body
                    });

                } catch (error) {
                    console.log('requestPremiumServiceAccess.renderPage', error)
                }
            }

            function redirectToSelectServicePage () {
                try {

                    req.flash('info', "Your request to gain access to the premium service has been submitted successfully. You will be notified via email when a decision has been made.");
                    return res.redirect(envVariables.applicationServiceURL + 'select-service');


                } catch (error) {
                    console.log('requestPremiumServiceAccess.redirectToSelectServicePage', error)
                }
            }

        }

    } catch (error) {
        console.log('requestPremiumAccessController.requestPremiumServiceAccess', error)
    }

};

module.exports.approve = async function(req, res) {

    try {

        let token = req.params['token']
        let userAccountMatchingToken = await findAccountMatchingToken(token)

        if (userAccountMatchingToken === null || userAccountMatchingToken.length === 0) {
            return res.render('account_pages/approve-reject-premium-service-access.ejs', {
                requestType: 'approve',
                success: false
            });
        } else {
            let userAccountDetails = await findAccountDetails(userAccountMatchingToken.id)
            await grantPermissionsToUserAccount(userAccountMatchingToken)
            await emailService.premiumServiceDecision(userAccountMatchingToken, 'approve')
            await sendAccountUpdateToOrbit(userAccountMatchingToken, userAccountDetails)
            await sendAccountUpdateToCASEBOOK(userAccountMatchingToken, userAccountDetails)

            return res.render('account_pages/approve-reject-premium-service-access.ejs', {
                userEmail: userAccountMatchingToken.email,
                requestType: 'approve',
                success: true
            });
        }

        async function findAccountMatchingToken(token) {
            try {
                return await Model.User.findOne({
                    where: {
                        premiumUpgradeToken: token
                    }
                })
            } catch (error) {
                console.log('approve.findAccountMatchingToken', error)
            }
        }

        async function findAccountDetails(id) {
            try {
                return await Model.AccountDetails.findOne({
                    where: {
                        user_id: id
                    }
                })
            } catch (error) {
                console.log('approve.findAccountDetails', error)
            }
        }

        async function grantPermissionsToUserAccount(userAccountMatchingToken) {
            try {
                return await Model.User.update({
                    premiumServiceEnabled: true,
                    premiumUpgradeToken: null
                }, {
                    where: {
                        email: userAccountMatchingToken.email
                    }
                })
            } catch (error) {
                console.log('approve.grantPermissionsToUserAccount', error)
            }
        }

        async function sendAccountUpdateToCASEBOOK(userAccountMatchingToken, userAccountDetails) {
            try {

                let accountManagementObject = {
                    "portalCustomerUpdate": {
                        "userId": "legalisation",
                        "timestamp": (new Date()).getTime().toString(),
                        "portalCustomer": {
                            "portalCustomerId": userAccountMatchingToken.id,
                            "forenames": userAccountDetails.first_name,
                            "surname": userAccountDetails.last_name,
                            "primaryTelephone": userAccountDetails.telephone,
                            "mobileTelephone": (userAccountDetails.mobileNo !== null) ? userAccountDetails.mobileNo : "",
                            "eveningTelephone": "",
                            "email": userAccountMatchingToken.email,
                            "companyName": userAccountDetails.company_name,
                            "companyRegistrationNumber": ''
                        }
                    }
                }

                // calculate HMAC string and encode in base64
                let objectString = JSON.stringify(accountManagementObject, null, 0);
                let hash = crypto.createHmac('sha512', config.hmacKey).update(new Buffer.from(objectString, 'utf-8')).digest('hex').toUpperCase();

                request.post({
                    headers: {
                        "accept": "application/json",
                        "hash": hash,
                        "content-type": "application/json; charset=utf-8",
                        "api-version": "3"
                    },
                    url: envVariables.accountManagementApiUrl,
                    agentOptions: envVariables.certPath ? {
                        cert: envVariables.certPath,
                        key: envVariables.keyPath
                    } : null,
                    json: true,
                    body: accountManagementObject
                }, function (error, response, body) {
                    if (error) {
                        console.log(JSON.stringify(error));
                    } else if (response.statusCode === 200) {
                        console.log('[ACCOUNT MANAGEMENT] ACCOUNT UPDATE SENT TO CASEBOOK SUCCESSFULLY FOR USER_ID ' + userAccountMatchingToken.id);
                    } else {
                        console.error('[ACCOUNT MANAGEMENT] ACCOUNT UPDATE FAILED SENDING TO CASEBOOK FOR USER_ID ' + userAccountMatchingToken.id);
                        console.error('response code: ' + response.code);
                        console.error(body);
                    }
                });

            } catch (error) {
                console.log('approve.sendAccountUpdateToCASEBOOK', error)
            }

        }

        async function sendAccountUpdateToOrbit(userAccountMatchingToken, userAccountDetails) {

            try {

                var edmsManagePortalCustomerUrl = config.edmsHost + '/api/v1/managePortalCustomer'
                var edmsBearerToken = config.edmsBearerToken

                let accountManagementObject = {
                    "portalCustomerUpdate": {
                        "userId": "legalisation",
                        "timestamp": (new Date()).getTime().toString(),
                        "portalCustomer": {
                            "portalCustomerId": userAccountMatchingToken.id,
                            "forenames": userAccountDetails.first_name,
                            "surname": userAccountDetails.last_name,
                            "primaryTelephone": userAccountDetails.telephone,
                            "mobileTelephone": (userAccountDetails.mobileNo !== null) ? userAccountDetails.mobileNo : '',
                            "eveningTelephone": '',
                            "email": userAccountMatchingToken.email,
                            "companyName": userAccountDetails.company_name,
                            "companyRegistrationNumber": ''
                        }
                    }
                }

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
                        console.log('[ACCOUNT MANAGEMENT] ACCOUNT UPDATE SENT TO ORBIT SUCCESSFULLY FOR USER_ID ' + userAccountMatchingToken.id);
                    } else {
                        console.error('[ACCOUNT MANAGEMENT] ACCOUNT UPDATE FAILED SENDING TO ORBIT FOR USER_ID ' + userAccountMatchingToken.id);
                        console.error('response code: ' + response.code);
                        console.error(body);
                    }
                })

            } catch (error) {
                console.log('approve.sendAccountUpdateToOrbit', error)
            }

        }

    } catch (error) {
        console.log('requestPremiumAccessController.approve', error)
    }

};

module.exports.reject = async function(req, res) {

    try {

        async function findAccountMatchingToken(token) {
            try {
                return await Model.User.findOne({
                    where: {
                        premiumUpgradeToken: token
                    }
                })
            } catch (error) {
                console.log('reject.findAccountMatchingToken', error)
            }
        }

        async function rejectPermissionsToUserAccount(userAccountMatchingToken) {
            try {
                return await Model.User.update({
                    premiumServiceEnabled: false,
                    premiumUpgradeToken: null
                }, {
                    where: {
                        email: userAccountMatchingToken.email
                    }
                })
            } catch (error) {
                console.log('reject.rejectPermissionsToUserAccount', error)
            }
        }

        async function clearCompanyName(userAccountMatchingToken) {
            try {
                return await Model.AccountDetails.update({
                    company_name: 'N/A'
                }, {
                    where: {
                        user_id: userAccountMatchingToken.id
                    }
                })
            } catch (error) {
                console.log('reject.clearCompanyName', error)
            }
        }

        async function sendAccountUpdateToCASEBOOK(userAccountMatchingToken, userAccountDetails) {
            try {

                let accountManagementObject = {
                    "portalCustomerUpdate": {
                        "userId": "legalisation",
                        "timestamp": (new Date()).getTime().toString(),
                        "portalCustomer": {
                            "portalCustomerId": userAccountMatchingToken.id,
                            "forenames": userAccountDetails.first_name,
                            "surname": userAccountDetails.last_name,
                            "primaryTelephone": userAccountDetails.telephone,
                            "mobileTelephone": (userAccountDetails.mobileNo !== null) ? userAccountDetails.mobileNo : "",
                            "eveningTelephone": "",
                            "email": userAccountMatchingToken.email,
                            "companyName": "",
                            "companyRegistrationNumber": ""
                        }
                    }
                }

                // calculate HMAC string and encode in base64
                let objectString = JSON.stringify(accountManagementObject, null, 0);
                let hash = crypto.createHmac('sha512', config.hmacKey).update(new Buffer.from(objectString, 'utf-8')).digest('hex').toUpperCase();

                request.post({
                    headers: {
                        "accept": "application/json",
                        "hash": hash,
                        "content-type": "application/json; charset=utf-8",
                        "api-version": "3"
                    },
                    url: envVariables.accountManagementApiUrl,
                    agentOptions: envVariables.certPath ? {
                        cert: envVariables.certPath,
                        key: envVariables.keyPath
                    } : null,
                    json: true,
                    body: accountManagementObject
                }, function (error, response, body) {
                    if (error) {
                        console.log(JSON.stringify(error));
                    } else if (response.statusCode === 200) {
                        console.log('[ACCOUNT MANAGEMENT] ACCOUNT UPDATE SENT TO CASEBOOK SUCCESSFULLY FOR USER_ID ' + userAccountMatchingToken.id);
                    } else {
                        console.error('[ACCOUNT MANAGEMENT] ACCOUNT UPDATE FAILED SENDING TO CASEBOOK FOR USER_ID ' + userAccountMatchingToken.id);
                        console.error('response code: ' + response.code);
                        console.error(body);
                    }
                });

            } catch (error) {
                console.log('reject.sendAccountUpdateToCASEBOOK', error)
            }

        }

        async function sendAccountUpdateToOrbit(userAccountMatchingToken, userAccountDetails) {

            try {

                var edmsManagePortalCustomerUrl = config.edmsHost + '/api/v1/managePortalCustomer'
                var edmsBearerToken = config.edmsBearerToken

                let accountManagementObject = {
                    "portalCustomerUpdate": {
                        "userId": "legalisation",
                        "timestamp": (new Date()).getTime().toString(),
                        "portalCustomer": {
                            "portalCustomerId": userAccountMatchingToken.id,
                            "forenames": userAccountDetails.first_name,
                            "surname": userAccountDetails.last_name,
                            "primaryTelephone": userAccountDetails.telephone,
                            "mobileTelephone": (userAccountDetails.mobileNo !== null) ? userAccountDetails.mobileNo : '',
                            "eveningTelephone": "",
                            "email": userAccountMatchingToken.email,
                            "companyName": "",
                            "companyRegistrationNumber": ""
                        }
                    }
                }

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
                        console.log('[ACCOUNT MANAGEMENT] ACCOUNT UPDATE SENT TO ORBIT SUCCESSFULLY FOR USER_ID ' + userAccountMatchingToken.id);
                    } else {
                        console.error('[ACCOUNT MANAGEMENT] ACCOUNT UPDATE FAILED SENDING TO ORBIT FOR USER_ID ' + userAccountMatchingToken.id);
                        console.error('response code: ' + response.code);
                        console.error(body);
                    }
                })

            } catch (error) {
                console.log('reject.sendAccountUpdateToOrbit', error)
            }

        }

        async function findAccountDetails(id) {
            try {
                return await Model.AccountDetails.findOne({
                    where: {
                        user_id: id
                    }
                })
            } catch (error) {
                console.log('reject.findAccountDetails', error)
            }
        }

        let token = req.params['token']
        let userAccountMatchingToken = await findAccountMatchingToken(token)
        let userAccountDetails = await findAccountDetails(userAccountMatchingToken.id)

        if (userAccountMatchingToken === null || userAccountMatchingToken.length === 0) {
            return res.render('account_pages/approve-reject-premium-service-access.ejs', {
                requestType: 'reject',
                success: false
            });
        } else {
            await rejectPermissionsToUserAccount(userAccountMatchingToken)
            await clearCompanyName(userAccountMatchingToken)
            await emailService.premiumServiceDecision(userAccountMatchingToken, 'reject')
            await sendAccountUpdateToOrbit(userAccountMatchingToken, userAccountDetails)
            await sendAccountUpdateToCASEBOOK(userAccountMatchingToken, userAccountDetails)

            return res.render('account_pages/approve-reject-premium-service-access.ejs', {
                userEmail: userAccountMatchingToken.email,
                requestType: 'reject',
                success: true
            });
        }

    } catch (error) {
        console.log('requestPremiumAccessController.reject', error)
    }

};