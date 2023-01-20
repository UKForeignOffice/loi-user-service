const Model = require("../model/models");
const moment = require("moment");
const { Op } = require("sequelize");

let OneTimePasscodeService = {

    generateOneTimePasscode: async function () {
        // generate a 6 digit passcode
        return Math.floor(100000 + Math.random() * 900000)
    },

    checkIfOneTimePasscodeExists: async function (user_id) {
        try {
            return await Model.OneTimePasscodes.findOne({
                where: {
                    user_id: user_id
                }
            })
        } catch (error) {
            console.log(error)
        }
    },

    deleteOneTimePasscode: async function (user_id) {
        try {
            return await Model.OneTimePasscodes.destroy({
                where: {
                    user_id: user_id
                }
            })
        } catch (error) {
            console.log(error)
        }
    },

    storeNewOneTimePasscode: async function (user_id, one_time_passcode) {
        try {
            return await Model.OneTimePasscodes.create({
                user_id: user_id,
                passcode: one_time_passcode,
                passcode_expiry: moment(Date.now()).add(10, 'minutes')
            })
        } catch (error) {
            console.log(error)
        }
    },

    verifyUser: async function (user_id, passcode) {
        try {

            return await Model.OneTimePasscodes.findOne({
                where: {
                    user_id: user_id,
                    passcode: passcode,
                    passcode_expiry: {
                        [Op.gte]: moment().toDate()
                    }
                }
            })

        } catch (error) {
            console.log(error)
        }
    },

    updateAccountPasscodeExpiryTime: async function (user_id) {
        try {
            return await Model.User.update({
                oneTimePasscodeExpiry: moment().add(1, 'day').toDate(),
                oneTimePasscodeAttempts: 0
            }, {
                where: {
                    id: user_id
                }
            })
        } catch (error) {
            console.log(error)
        }
    },

    updateMfaPreferenceToSMS: async function (user_id) {
        try {
            return await Model.User.update({
                mfaPreference: 'SMS'
            }, {
                where: {
                    id: user_id
                }
            })
        } catch (error) {
            console.log(error)
        }
    },

    checkMobileNumber: async function (user_id) {
        try {

            return await Model.AccountDetails.findOne({
                where: {
                    user_id: user_id
                },
                attributes: ['mobileNo']
            })

        } catch (error) {
            console.log(error)
        }
    },

    updateAccountMobileNumber: async function (user_id, phone_number) {
        try {
            return await Model.AccountDetails.update({
                mobileNo: phone_number
            }, {
                where: {
                    user_id: user_id
                }
            })
        } catch (error) {
            console.log(error)
        }
    },

    updateAccountPasscodeAttempts: async function (attempts, user_id) {
        try {
            return await Model.User.update({
                oneTimePasscodeAttempts: attempts
            }, {
                where: {
                    id: user_id
                }
            })
        } catch (error) {
            console.log(error)
        }
    },

    getUserData: async function (user_id) {
        try {
            return await Model.User.findOne({
                where: {
                    id: user_id
                }
            })
        } catch (error) {
            console.log(error)
        }
    },

    getAccountData: async function (user_id) {
        try {
            return await Model.AccountDetails.findOne({
                where: {
                    user_id: user_id
                }
            })
        } catch (error) {
            console.log(error)
        }
    }

}

module.exports = OneTimePasscodeService;