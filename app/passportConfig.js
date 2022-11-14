var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    bcrypt = require('bcryptjs'),
    Model = require('./model/models.js'),
    common = require('../config/common.js'),
    envVariables = common.config(),
    emailService = require('./services/emailService.js');

module.exports = function(app,passport) {
    app.use(passport.initialize());
    app.use(passport.session());

    passport.use(new LocalStrategy(
        function(email, password, done) {
            Model.User.findOne({
                where: {
                    'email': email
                }
            }).then(function (user) {
                if (user === null) {
                    return done(null, false, { message: 'There was a problem signing in' });
                }

                if(user.failedLoginAttemptCount>=envVariables.password_settings.maxLoginAttempts){
                    return done(null, false, { message: 'There was a problem signing in' });
                }
                var hashedPassword = bcrypt.hashSync(password, user.salt);

                if (user.password === hashedPassword) {
                    if(!user.activated){
                        //users account is not yet activated
                        return done(null, false, { message: 'Activation failed' });
                    }
                    else  if(user.accountExpiry < new Date()){
                        //users account has expired
                        return done(null, false, { message: 'Account expired' });
                    }
                    else {
                        var  accountExpiry= new Date(new Date().setFullYear(new Date().getFullYear() + 1));
                        Model.User.update({failedLoginAttemptCount: 0, accountExpiry:accountExpiry, warningSent:false, expiryConfirmationSent:false}, {
                            where: {
                                'email': email
                            }
                        }).then(function () {
                            return done(null, user);

                        });
                    }

                }
                else{
                    Model.User.update({failedLoginAttemptCount: user.failedLoginAttemptCount+1},{where: {
                        'email': email
                    }}).then(function(){
                        if(user.failedLoginAttemptCount+1>=envVariables.password_settings.maxLoginAttempts) {
                            Model.User.update({
                                failedLoginAttemptCount: user.failedLoginAttemptCount + 1,
                                accountLocked: true
                            }, {
                                where: {
                                    'email': email
                                }
                            }).then(function () {
                                emailService.lockedOut(user.first_name, email);
                                console.info('ACCOUNT LOCKED - UserID:'+user.id);
                                return done(null, false, {message: 'There was a problem signing in'});
                            });
                        }
                        else{
                            return done(null, false, { message: 'There was a problem signing in' });
                        }

                    });
                }

            });
        }
    ));

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        Model.User.findOne({
            where: {
                'id': id
            }
        }).then(function (user) {
            if (user === null) {
                done(new Error('Wrong user id.'));
            }

            done(null, user);
        });
    });
};