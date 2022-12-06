// /**
//  * Created by preciousr on 07/01/2016.
//  */

// module.exports = {

require('dotenv').config()
var cookiedomain = JSON.parse(process.env.COOKIEDOMAIN);
var sequelizeusers = JSON.parse(process.env.SEQUELIZEUSERS);
var servicesequelize = JSON.parse(process.env.SERVICESEQUELIZE);
var applicationserviceurl = JSON.parse(process.env.APPLICATIONSERVICEURL);
var notificationserviceurl = JSON.parse(process.env.NOTIFICATIONSERVICEURL);
var passwordsettings = JSON.parse(process.env.PASSWORDSETTINGS);
var postcodelookupoptions = JSON.parse(process.env.POSTCODELOOKUPOPTIONS);
var live_variables = JSON.parse(process.env.LIVEVARIABLES);
var userAccountSettings = JSON.parse(process.env.USERACCOUNTSETTINGS);
var pgPassword = process.env.PGPASSWORD;
var Sequelize = require('sequelize');
var accountManagementApiUrl = process.env.ACCOUNTMANAGEMENTAPIURL;
var edmsHost = process.env.EDMS_HOST;
var edmsBearerToken = JSON.parse(process.env.EDMS_BEARER_TOKEN);
var certPath = process.env.CASEBOOKCERTIFICATE;
var keyPath = process.env.CASEBOOKKEY;
var hmacKey = process.env.HMACKEY;

var config = {
    "cookieDomain": cookiedomain,
    "sequelizeUsers":new Sequelize(sequelizeusers.sequelizeusers.dbName, sequelizeusers.sequelizeusers.dbUser, sequelizeusers.sequelizeusers.dbPass,
        {'host': sequelizeusers.userconnection.host,'port': sequelizeusers.userconnection.port, 'dialect': 'postgres', 'logging': false}),
    "serviceSequelize":new Sequelize(servicesequelize.servicesequelize.dbName, servicesequelize.servicesequelize.dbUser, servicesequelize.servicesequelize.dbPass,
        {'host': servicesequelize.serviceconnection.host,'port':servicesequelize.serviceconnection.port, 'dialect': 'postgres', 'logging': false}),
    "applicationServiceURL":applicationserviceurl.applicationserviceurl,
    "notificationServiceURL":notificationserviceurl.notificationserviceurl,
    "password_settings":passwordsettings,
    "postcodeLookUpApiOptions":postcodelookupoptions,
    "pgpassword": pgPassword,
    "userAccountSettings": userAccountSettings,
    "live_variables":live_variables,
    "accountManagementApiUrl":accountManagementApiUrl,
    "edmsHost":edmsHost,
    "edmsBearerToken":edmsBearerToken['EDMS-Web-Submissions-Token'],
    "certPath":certPath,
    "keyPath":keyPath,
    "hmacKey":hmacKey
};

module.exports = config;

