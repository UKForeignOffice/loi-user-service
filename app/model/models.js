var UserMeta = require('./User.js'),
    AccountDetailsMeta = require('./AccountDetails.js'),
    SavedAddressMeta = require('./SavedAddress.js'),
    usersDbConn = require('../sequelize.js');

var User = usersDbConn.define('Users', UserMeta.attributes, UserMeta.options);
var AccountDetails = usersDbConn.define('AccountDetails', AccountDetailsMeta.attributes, AccountDetailsMeta.options);
var SavedAddress = usersDbConn.define('SavedAddress', SavedAddressMeta.attributes, SavedAddressMeta.options);

// you can define relationships here

module.exports.User = User;
module.exports.AccountDetails = AccountDetails;
module.exports.SavedAddress = SavedAddress;
