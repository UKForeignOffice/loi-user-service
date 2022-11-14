let Sequelize = require('sequelize');

let attributes = {
    user_id: {
        type: 'integer',
        primaryKey: true,
        allowNull: false
    },
    passcode : {
        type: 'timestamp',
        allowNull: false
    },
    passcode_expiry : {
        type: 'date',
        allowNull: false
    }


};

let options = {
    freezeTableName: true,
    // disable createdAt and updatedAt columns
    timestamps: false
};

module.exports.attributes = attributes;
module.exports.options = options;