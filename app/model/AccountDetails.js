/**
 * Created by preciousr on 04/03/2016.
 */
/**
 * FCO LOI AccountDetails Management
 * AccountDetails Model
 *
 *
 */

var Sequelize = require('sequelize');

var attributes = {
    id: {
        type: 'integer',
        primaryKey: true,
        autoIncrement: true
    },

    first_name: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
            notEmpty: {
                msg: JSON.stringify([{
                    "errInfo": 'You have not provided your first name',
                    "errSoltn": 'Enter your first name',
                    "questionId" : 'first_name'
                }])
            }

        }
    },
    last_name: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
            notEmpty: {
                msg: JSON.stringify([{
                    "errInfo": 'You have not provided your last name',
                    "errSoltn": 'Enter your last name',
                    "questionId" : 'last_name'
                }])
            }
        }
    },
    telephone: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
            isPhone(value) {
                if (value === null) return;
                const isLengthValid = value.length >= 6 && value.length <= 25;
                if (!isLengthValid) {
                    throw new Error(JSON.stringify([{
                        "errInfo": 'You have not provided a valid phone number',
                        "errSoltn": 'Enter a valid phone number',
                        "questionId": 'telephone'
                    }]));
                }
            }
        }
    },
    mobileNo: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
            notEmptyString(value) {
                if (value === null) return;

                if (value === '' || value.length < 6 || value.length > 25) {
                    throw new Error(JSON.stringify([{
                        "errInfo": 'You have not provided a valid mobile number',
                        "errSoltn": 'Enter a valid mobile number',
                        "questionId": 'mobileNo'
                    }]));
                }
            }
        }
    },
    company_name: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
            len:{
                args: [1,50], //
                msg: JSON.stringify([{
                    "errInfo": 'You have not provided a valid company name.',
                    "errSoltn": 'Enter between 1 and 50 characters.',
                    "questionId" : 'company_name'
                }])
            }
        }
    },
    company_number: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
            isNumeric:{
                msg: JSON.stringify([{
                    "errInfo": 'You have not provided a valid company number',
                    "errSoltn": 'Enter a valid company number',
                    "questionId" : 'company number'
                }])
            },
            len:{
                args: [0,12],
                msg: JSON.stringify([{
                    "errInfo": 'The telephone you have provided is too short',
                    "errSoltn": 'Enter a valid company number',
                    "questionId" : 'company'
                }])
            }
        }
    },
    feedback_consent: {
        type: Sequelize.BOOLEAN(),
        allowNull: false,
        validate: {
            notEmpty: {
                msg: JSON.stringify([{
                    "errInfo": 'You have not provided an answer to the feedback question',
                    "errSoltn": 'Answer the feedback question',
                    "questionId": 'feedback_consent'
                }])
            }
        }
    },
    complete : {type: 'boolean', default: false},
    user_id : {type: 'integer', allowNull:false}


};

var options = {
    freezeTableName: true
};

module.exports.attributes = attributes;
module.exports.options = options;