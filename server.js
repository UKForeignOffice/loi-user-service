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
    csrf = require('csurf');

require('./config/logs');
require('dotenv').config();
const serverPort = (process.argv[2] && !isNaN(process.argv[2])  ? process.argv[2] : (process.env.PORT || 3001));


app.use(cookieParser());
app.use(csrf({cookie: true}));

app.use(function(req, res, next) {
    res.removeHeader("X-Powered-By");
    res.removeHeader("Server");
    return next();
});



// =====================================
// SESSION
// =====================================
const sessionSettings = JSON.parse(process.env.THESESSION);

app.use(function(req, res, next) {
    if (req.cookies['LoggedIn']){
        res.cookie('LoggedIn',true,{ maxAge: sessionSettings.cookieMaxAge, httpOnly: true });
    }
    return next();
});

const session = require("express-session")
const RedisStore = require("connect-redis")(session);
const { createClient } = require("redis");
const { password, port, host } = sessionSettings;
const connectTimeout = 15000;

const redisClient = createClient({
    legacyMode: true,
    password,
    socket: { connectTimeout, port, host, tls: process.env.NODE_ENV !== "development" },
});

redisClient.connect((err) => {
    if (err) {
        console.error("Redis client error:", err);
        next(err);
    } else {
        redisClientConnected = true;
        next();
    }
});

redisClient.on("connect", () => {
    console.log("Redis client connected successfully");
});

redisClient.on("error", (error) => {
    console.error("Redis client error:", error);
});

const redisStore = new RedisStore({ client: redisClient });

let redisClientConnected = false;

redisClient.on("ready", () => {
    redisClientConnected = true;
});

app.use((req, res, next) => {
    if (redisClientConnected) {
        next();
    } else {
        redisClient.connect((err) => {
            if (err) {
                console.error("Redis client error:", err);
                next(err);
            } else {
                redisClientConnected = true;
                next();
            }
        });
    }
});

app.use(
    session({
        store: redisStore,
        prefix: sessionSettings.prefix,
        saveUninitialized: false,
        secret: sessionSettings.secret,
        key: sessionSettings.key,
        resave: false,
        rolling: true,
        cookie: {
            domain: sessionSettings.domain,
            maxAge: sessionSettings.maxAge,
            secure: "auto",
        },
    })
);



// =====================================
// VIEW AND LOCALS
// =====================================
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


// =====================================
// PASSPORT CONFIG
// =====================================
app.use(flash()); //use connect-flash for flash messages stored in session
app.use(passport.initialize());
app.use(passport.session()); //persistent login sessions


app.use(jsonParser);
app.use(bodyParser.urlencoded({
  extended: true
}));





// =====================================
// JOB SCHEDULER
// =====================================
const schedule = require('node-schedule');
const jobs = require('./config/jobs.js');
// As there are 2 instances running, we need a random time, or two emails will be sent
// for accounts nearing expiration. (Flag will be set by time of 2nd job execution to stop duplicate)
const hourlyInterval = environmentVariables.userAccountSettings.jobScheduleHour
const randomSecond = Math.floor(Math.random() * 60);
const randomMin = Math.floor(Math.random() * 60); //Math.random returns a number from 0 to < 1 (never will return 60)
const jobScheduleRandom = randomSecond + " " + randomMin + " " + environmentVariables.userAccountSettings.jobScheduleHour + " * * *";
schedule.scheduleJob(jobScheduleRandom, function(){jobs.accountExpiryCheck()});


passportConfig(app, passport);
app.use('/api/user', appRouter);
//Automatically update passport strategy
var fs = require('fs-extra');
fs.copy(__dirname+'/data/strategy.js', __dirname+'/node_modules/passport-local/lib/strategy.js', function (err) {});




// =====================================
// GOV STYLES
// =====================================
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




// =====================================
// START APP
// =====================================
app.listen(serverPort);
console.log('Server started on port ' + serverPort);
console.log(`user account cleanup job will run every ${hourlyInterval} hours at ${randomMin} minutes and ${randomSecond} seconds past the hour`);
module.exports.getApp = app;
