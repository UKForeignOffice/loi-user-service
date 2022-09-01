// application

const express = require('express'),
    app = express(),
    common = require('./config/common.js'),
    environmentVariables = common.config(),
    passport = require('passport'),
    passportConfig = require('./app/passportConfig'),
    flash = require('connect-flash'),
    appRouter = require('./app/routes.js')(express,environmentVariables),
    bodyParser = require('body-parser'),
    jsonParser = bodyParser.json(),
    cookieParser = require('cookie-parser'),
    csrf = require('csurf'),
    lusca = require('lusca');

require('./config/logs');
require('dotenv').config();

const sessionSettings = JSON.parse(process.env.THESESSION);

app.use(cookieParser());
app.use(csrf({cookie: true}));

app.use(function(req, res, next) {
    res.removeHeader("X-Powered-By");
    res.removeHeader("Server");
    return next();
});

app.use(lusca.csp({
    policy: {
        'default-src': "'none'",
        'connect-src': process.env.NODE_ENV === 'development' ?
            "'self' http://web-analytics.fco.gov.uk/piwik/piwik.php https://web-analytics.fco.gov.uk/piwik/piwik.php" :
            "'self' https://web-analytics.fco.gov.uk/piwik/piwik.php",
        'font-src': "'self' data:",
        'form-action': process.env.NODE_ENV === 'development' ? "'self' https://www.payments.service.gov.uk localhost:*" : "'self' https://www.payments.service.gov.uk",
        'img-src': "'self'",
        'script-src': process.env.NODE_ENV === 'development' ?
            "'self' 'unsafe-inline' http://web-analytics.fco.gov.uk/piwik/piwik.js https://web-analytics.fco.gov.uk/piwik/piwik.js localhost:*" :
            "'self' 'unsafe-inline' https://web-analytics.fco.gov.uk/piwik/piwik.js",
        'style-src': "'self' 'unsafe-inline'"
    }
}));

app.use(function(req, res, next) {
    if (req.cookies['LoggedIn']){
        res.cookie('LoggedIn',true,{ maxAge: sessionSettings.cookieMaxAge, httpOnly: true });
    }
    return next();
});

const port = (process.argv[2] && !isNaN(process.argv[2])  ? process.argv[2] : (process.env.PORT || 8080));

const session = require("express-session")
let RedisStore = require("connect-redis")(session)

const { createClient } = require("redis")
let redisClient = createClient({
    legacyMode: true,
    password: sessionSettings.password,
    socket: {
        port: sessionSettings.port,
        host: sessionSettings.host,
        tls: process.env.NODE_ENV !== 'development'
    }
})

redisClient.connect().catch(console.error)

app.use(
    session({
        store: new RedisStore({ client: redisClient }),
        prefix: sessionSettings.prefix,
        saveUninitialized: false,
        secret: sessionSettings.secret,
        key: sessionSettings.key,
        resave: false,
        rolling: true,
        cookie: {
            domain: sessionSettings.domain,
            maxAge: sessionSettings.maxAge,
            secure: 'auto'
        }
    })
)

app.set('view engine', 'ejs');

app.use(function (req, res, next) {
    res.locals = {
        piwikID: environmentVariables.live_variables.piwikId,
        feedbackURL: environmentVariables.live_variables.feedbackURL,
        service_public: environmentVariables.live_variables.Public,
        start_url: environmentVariables.live_variables.startPageURL,
        govuk_url: environmentVariables.live_variables.GOVUKURL,
        _csrf: req.csrfToken()
    };
    next();
});

app.use(flash()); //use connect-flash for flash messages stored in session
app.use(passport.initialize());
app.use(passport.session()); //persistent login sessions


app.use(jsonParser);
app.use(bodyParser.urlencoded({
  extended: true
}));





//Schedule and run account expiry job every day
var schedule = require('node-schedule');
var jobs = require('./config/jobs.js');

// As there are 2 instances running, we need a random time, or two emails will be sent
// for accounts nearing expiration. (Flag will be set by time of 2nd job execution to stop duplicate)
var randomSecond = Math.floor(Math.random() * 60);
var randomMin = Math.floor(Math.random() * 60); //Math.random returns a number from 0 to < 1 (never will return 60)
var jobScheduleRandom = randomSecond + " " + randomMin + " " + environmentVariables.userAccountSettings.jobScheduleHour + " * * *";

var ExpiryJob = schedule.scheduleJob(jobScheduleRandom, function(){jobs.accountExpiryCheck()});


passportConfig(app, passport);
app.use('/api/user', appRouter);






//Automatically update passport strategy
var fs = require('fs-extra');
fs.copy(__dirname+'/data/strategy.js', __dirname+'/node_modules/passport-local/lib/strategy.js', function (err) {});


app.use("/api/user/",express.static(__dirname + "/public"));

app.use("/api/user/styles",express.static(__dirname + "/styles"));
app.use("/api/user/fonts",express.static(__dirname + "/fonts"));
app.use("/api/user/images",express.static(__dirname + "/images"));
app.use("/api/user/js",express.static(__dirname + "/js"));

//Pull in images from GOVUK packages

fs.copy('node_modules/govuk_frontend_toolkit/images', 'images/govuk_frontend_toolkit', function (err) {
    if (err) return console.error(err);
});
fs.mkdirs('images/govuk_frontend_toolkit/icons', function (err) {
    if (err) return console.error(err);
});
fs.readdir('images/govuk_frontend_toolkit', function(err, items) {
    for (var i=0; i<items.length; i++) {
        if('images/govuk_frontend_toolkit/'+items[i].substr(0,5)=='images/govuk_frontend_toolkit/icon-' && items[i].substr(items[i].length-3,3)=='png'){
           moveItem(items[i]);
        }
    }
});
function moveItem(item){
    fs.move('images/govuk_frontend_toolkit/'+item, 'images/govuk_frontend_toolkit/icons/'+item,{ clobber: true }, function (err) {
        if (err) return console.error(err);
    });
}

// start app
app.listen(port);
console.log('Server started on port ' + port);
console.log('user account cleanup job will run at %sh %sm %ss', environmentVariables.userAccountSettings.jobScheduleHour, randomMin, randomSecond)
module.exports.getApp = app;
