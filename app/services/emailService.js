/**
 * Created by preciousr on 21/01/2016.
 */
var request = require('request'),
    common = require('../../config/common.js'),
    envVariables = common.config();


emailService = {
    lockedOut: function(name,email){

        var url = '/account_locked';
        var postData= {to: email, name: name};

        // send request to notification service
        request(setOptions(postData, url), function (err, res, body) {
            if(err) {
                console.log(err);
            } else {
                console.log(res.statusCode, body);
            }
        });
    },
    resetPassword: function(email,token){

        var url = '/reset-password';
        var postData= {to: email, token: token};

        // send request to notification service
        request(setOptions(postData, url), function (err, res, body) {
            if(err) {
                console.log(err);
            } else {
                console.log(res.statusCode, body);
            }
        });
    },
    confirmPasswordChange: function(name,email){

        var url = '/password-updated';
        var postData= {to: email, name: name};

        // send request to notification service
        request(setOptions(postData, url), function (err, res, body) {
            if(err) {
                console.log(err);
            } else {
                console.log(res.statusCode, body);
            }
        });
    },
    emailConfirmation: function(email,token){

        var url = '/confirm-email';
        var postData= {to: email, token: token};

        // send request to notification service
        request(setOptions(postData, url), function (err, res, body) {
            if(err) {
                console.log(err);
            } else {
                console.log(res.statusCode, body);
            }
        });
    },
    expiryWarning: async function(email, accountExpiryDateText, dayAndMonthText, userID){
        
        var url = '/expiry_warning';
        var postData= {to: email, accountExpiryDateText: accountExpiryDateText, dayAndMonthText: dayAndMonthText};
        
        // send request to notification service
        request(setOptions(postData, url), function (err) {
            if(err) {
                console.log(err);
            } else {
                console.log('[USER CLEANUP JOB] WARNING EMAIL SENT SUCCESSFULLY FOR USER ' + userID);
            }
        });
    },
    expiryConfirmation: async function(email, userID){
    
        var url = '/expiry_confirmation';
        var postData= {to: email};
    
        // send request to notification service
        request(setOptions(postData, url), function (err) {
            if(err) {
                console.log(err);
            } else {
                console.log('[USER CLEANUP JOB] EXPIRY EMAIL SENT SUCCESSFULLY FOR USER ' + userID);
            }
        });
    },
    requestPremiumAccess: async function(emailData){

        var url = '/request-premium-access';

        // send request to notification service
        request(setOptions(emailData, url), function (err) {
            if(err) {
                console.log(err);
            } else {
                console.log('PREMIUM SERVICE APPLICATION REQUEST SENT SUCCESSFULLY FOR USER ' + emailData.userID);
            }
        });
    },
    premiumServiceDecision: async function(emailData, decision){

        var url = '/premium-service-decision';
        var postData = {to: emailData.email, decision: decision};

        // send request to notification service
        request(setOptions(postData, url), function (err) {
            if(err) {
                console.log(err);
            } else {
                if (decision === 'approve') {
                    console.log('PREMIUM SERVICE ACCESS APPROVAL EMAIL SENT SUCCESSFULLY FOR USER ' + emailData.id);
                } else {
                    console.log('PREMIUM SERVICE ACCESS REJECTION EMAIL SENT SUCCESSFULLY FOR USER ' + emailData.id);
                }

            }
        });
    }
};

module.exports = emailService;

function setOptions(postData, url){
    var options = {
        url: envVariables.notificationServiceURL+url,
        headers:
        {
            'cache-control': 'no-cache',
            'content-type': 'application/json'
        },
        method: 'POST',
        json: true,
        body: postData
    };
    return options;
}
