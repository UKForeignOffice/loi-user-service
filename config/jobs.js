const Model = require('../app/model/models.js'),
    common = require('./common.js'),
    moment = require('moment'),
    envVariables = common.config(),
    emailService = require('../app/services/emailService');

const jobs ={

    accountExpiryCheck: async function() {

        const formattedDate = moment().toISOString()
        const now = new Date()
        let gracePeriod = new Date(now)
        gracePeriod.setDate(now.getDate()+envVariables.userAccountSettings.gracePeriod);

        try {

            start()
            let accountsNearingExpiry = await findAccountsNearingExpiry()

            if (accountsNearingExpiry.length === 0) {
                abort('AS NO ELIGIBLE ACCOUNTS EXIST')
                throw new Error('EXITING');
            } else {
                await processAccountsNearingExpiry(accountsNearingExpiry)
            }

            stop()

        } catch (error) {
            console.log(error)
        }

        function start() {
            console.log('[%s][USER CLEANUP JOB] STARTED', formattedDate);
        }

        function stop() {
            console.log('[%s][USER CLEANUP JOB] FINISHED', formattedDate);
        }

        function abort(reason) {
            console.log('[%s][USER CLEANUP JOB] ABORTED %s', formattedDate, reason);
        }

        async function findAccountsNearingExpiry() {
            const { Op } = require("sequelize");
            try {
                return await Model.User.findAll({
                    where: {
                        accountExpiry: {
                            [Op.lte]: gracePeriod
                        }
                    }
                })
            } catch (error) {
                console.log(error)
            }
        }

        async function updateWarningEmailField(user) {
            try {
                return await Model.User.update({
                    warningSent: true
                }, {
                    where: {
                        email: user.email
                    }
                })
            } catch (error) {
                console.log(error)
            }
        }

        async function updateExpiryEmailField(user) {
            try {
                return await Model.User.update({
                    expiryConfirmationSent: true
                }, {
                    where: {
                        email: user.email
                    }
                })
            } catch (error) {
                console.log(error)
            }
        }

        async function deleteAccountDetailsForUser(user) {
            try {
                return await Model.AccountDetails.destroy({
                    where: {
                        user_id: user.id
                    }
                })
            } catch (error) {
                console.log(error)
            }
        }

        async function deleteSavedAddressForUser(user) {
            try {
                return await Model.SavedAddress.destroy({
                    where: {
                        user_id: user.id
                    }
                })
            } catch (error) {
                console.log(error)
            }
        }

        async function deleteUserDetailsForUser(user) {
            try {
                return await Model.User.destroy({
                    where: {
                        email: user.email
                    }
                })
            } catch (error) {
                console.log(error)
            }
        }

        async function sendWarningEmail(user, accountExpiryDateText, dayAndMonthText) {
            console.log('[USER CLEANUP JOB] SENDING WARNING EMAIL FOR USER ' + user.id);
            emailService.expiryWarning(user.email,accountExpiryDateText,dayAndMonthText, user.id);
        }

        async function sendExpiryEmail(user) {
            console.log('[USER CLEANUP JOB] SENDING EXPIRY EMAIL FOR USER ' + user.id);
            emailService.expiryConfirmation(user.email, user.id);
        }

        async function processAccountsNearingExpiry(accountsNearingExpiry){
            try {
                for (let user of accountsNearingExpiry) {

                    console.log('[USER CLEANUP JOB] PROCESSING USER ' + user.id);

                    let expired = user.accountExpiry < now,
                        expiringSoon = user.accountExpiry < gracePeriod,
                        warningSent = user.warningSent,
                        expiryConfirmationSent = user.expiryConfirmationSent,
                        accountExpiryDateText = moment(user.accountExpiry).format('Do MMMM YYYY'),
                        dayAndMonthText = moment(user.accountExpiry).format('Do MMMM');

                    if (!expired && expiringSoon && !warningSent) {
                        await sendWarningEmail(user, accountExpiryDateText, dayAndMonthText)
                        await updateWarningEmailField(user)
                    } else if (expired && !expiryConfirmationSent) {
                        await sendExpiryEmail(user)
                        await updateExpiryEmailField(user)
                        await deleteAccountDetailsForUser(user)
                        await deleteSavedAddressForUser(user)
                        await deleteUserDetailsForUser(user)
                        console.log('[USER CLEANUP JOB] ACCOUNT DELETED SUCCESSFULLY FOR USER ' + user.id);
                    } else {
                        console.log('[USER CLEANUP JOB] NO ACTION REQUIRED FOR USER ' + user.id);
                    }
                }
            } catch {
                console.log(error)
            }

        }
    }
};
module.exports = jobs;
