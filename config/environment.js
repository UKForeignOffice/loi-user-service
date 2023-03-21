require('dotenv').config();
const cookiedomain = JSON.parse(process.env.COOKIEDOMAIN);
const sequelizeusers = JSON.parse(process.env.SEQUELIZEUSERS);
const servicesequelize = JSON.parse(process.env.SERVICESEQUELIZE);
const applicationserviceurl = JSON.parse(process.env.APPLICATIONSERVICEURL);
const notificationserviceurl = JSON.parse(process.env.NOTIFICATIONSERVICEURL);
const passwordsettings = JSON.parse(process.env.PASSWORDSETTINGS);
const postcodelookupoptions = JSON.parse(process.env.POSTCODELOOKUPOPTIONS);
const live_variables = JSON.parse(process.env.LIVEVARIABLES);
const userAccountSettings = JSON.parse(process.env.USERACCOUNTSETTINGS);
const pgPassword = process.env.PGPASSWORD;
const Sequelize = require('sequelize');
const accountManagementApiUrl = process.env.ACCOUNTMANAGEMENTAPIURL;
const certPath = process.env.NODE_ENV !== 'development' ? process.env.CASEBOOKCERTIFICATE : process.env.CASEBOOKCERTIFICATE.replace(/\\n/gm, '\n');
const keyPath = process.env.NODE_ENV !== 'development' ? process.env.CASEBOOKKEY : process.env.CASEBOOKKEY.replace(/\\n/gm, '\n');
const hmacKey = process.env.HMACKEY;

const sequelizeUsers = new Sequelize(
    sequelizeusers.sequelizeusers.dbName,
    sequelizeusers.sequelizeusers.dbUser,
    sequelizeusers.sequelizeusers.dbPass,
    {
        host: sequelizeusers.userconnection.host,
        port: sequelizeusers.userconnection.port,
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            'connectTimeout': 15000 // 15 seconds timeout
        },
        retry: {
            base: 1000,
            multiplier: 2,
            max: 5000,
        }
    }
)

const serviceSequelize = new Sequelize(
    servicesequelize.servicesequelize.dbName,
    servicesequelize.servicesequelize.dbUser,
    servicesequelize.servicesequelize.dbPass,
    {
        host: servicesequelize.serviceconnection.host,
        port: servicesequelize.serviceconnection.port,
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            'connectTimeout': 15000 // 15 seconds timeout
        },
        retry: {
            base: 1000,
            multiplier: 2,
            max: 5000,
        }
    }
)

//=========================
// SEQUELIZE CONNECTION
//=========================
sequelizeUsers.authenticate().then(() => {
    console.log(`Connection has been established to ${sequelizeusers.sequelizeusers.dbName} successfully.`);
}).catch((error) => {
    console.error(`Unable to connect to the ${sequelizeusers.sequelizeusers.dbName} database: ${error}`);
});

serviceSequelize.authenticate().then(() => {
    console.log(`Connection has been established to ${servicesequelize.servicesequelize.dbName} successfully.`);
}).catch((error) => {
    console.error(`Unable to connect to the ${servicesequelize.servicesequelize.dbName} database: ${error}`);
});

const config = {
    "cookieDomain": cookiedomain,
    sequelizeUsers,
    serviceSequelize,
    "applicationServiceURL": applicationserviceurl.applicationserviceurl,
    "notificationServiceURL": notificationserviceurl.notificationserviceurl,
    "password_settings": passwordsettings,
    "postcodeLookUpApiOptions": postcodelookupoptions,
    "pgpassword": pgPassword,
    "userAccountSettings": userAccountSettings,
    "live_variables": live_variables,
    "accountManagementApiUrl": accountManagementApiUrl,
    "certPath": certPath,
    "keyPath": keyPath,
    "hmacKey": hmacKey
};

module.exports = config;
