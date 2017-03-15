/**
 * FCO LOI User Management
 * Registration Controller
 *
 *
 */

var async = require('async'),
    crypto = require('crypto'),
    Sequelize = require('sequelize'),
    Model = require('../model/models.js'),
    ValidationService = require('../services/ValidationService.js'),
    common = require('../../config/common.js'),
    envVariables = common.config();



module.exports.showUKQuestion = function(req, res) {
    Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
        Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(account){
            return res.render('address_pages/UKQuestion.ejs', {
                initial: req.session.initial,
                user:user,
                account:account,
                url:envVariables,
                error_report:req.flash('error')
            });
        });
    });
};

module.exports.submitUKQuestion = function(req,res){
    if(typeof(req.body.is_uk) == 'undefined'){
        // ERROR HANDLING
        req.flash('error','Choose an option below');
        var error_redirect = '/api/user/add-address';
        return res.redirect(error_redirect);

    }else if(JSON.parse(req.body.is_uk)){
        Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
            Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(account){
                return res.render('address_pages/UKAddressPostcodeEntry.ejs', {
                    initial: req.session.initial,
                    user:user,
                    account:account,
                    url:envVariables,
                    error_report:req.flash('error')
                });
            });
        });
    }else{
        return getCountries().then(function (countries) {
            Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
                Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(account){
                    return res.render('address_pages/IntlAddress.ejs', {
                        error_report: false,
                        initial: req.session.initial,
                        user:user,
                        account:account,
                        url:envVariables,
                        form_values: false,
                        countries:countries[0]
                    });
                });
            });
        });
    }
};

module.exports.showPostcodeLookup = function(req,res){
    Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
        Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(account){
            return res.render('address_pages/UKAddressPostcodeEntry.ejs', {
                initial: req.session.initial,
                user:user,
                account:account,
                url:envVariables,
                error_report:req.flash('error')
            });
        });
    });
};

module.exports.findAddress= function(req,res) {
    var Postcode = require("postcode");
    var postcode = '';


    if(!req.query.postcode && !req.body['find-postcode']){
        return res.redirect('/api/user/add-address-uk?is_uk=true');
    }else if(req.query && req.query.postcode){
        postcode = new Postcode(req.query.postcode.replace(/ /g,''));
    }else{
        postcode = new Postcode(req.body['find-postcode'].replace(/ /g,''));
    }



    Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
        Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(account){
            if(!postcode.valid()){
                req.flash('error', 'Enter a valid postcode');
                return res.render('address_pages/UKAddressSelect.ejs', {
                    initial: req.session.initial,
                    user:user,
                    account:account,
                    url:envVariables,
                    addresses: false,
                    postcode: postcode.normalise(),
                    error_report:req.flash('error')
                });
            }else {
                postcodeLookup(postcode.normalise()).then(function (results) {
                    var addresses = [];
                    if (JSON.parse(results).message == 'No matching address found: no response') {
                        req.flash('error', 'No addresses found');
                        addresses = false;
                    } else {
                        var jsonResults = JSON.parse(results);
                        addresses = [];
                        jsonResults.forEach(function (address) {


                            var fullAddress = '';
                            fullAddress += address.organisation ? address.organisation + ', ' : '';
                            fullAddress += address.house_name   ? address.house_name + ', ' : '';
                            fullAddress += address.street       ? address.street + ', ' : '';
                            fullAddress += address.town         ? toTitleCase(address.town)  : '';
                            fullAddress += address.county       ?  ', '+address.county : '';


                            function toTitleCase(str) {
                                return str.replace(/\w\S*/g, function (txt) {
                                    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                                });
                            }

                            addresses.push({
                                option: fullAddress,
                                organisation: address.organisation,
                                house_name: address.house_name,
                                street: address.street !== null && address.street !== 'undefined' && address.street !== undefined ? address.street : '',
                                town: address.town !== null && address.town !== 'undefined' && address.town !== undefined ? toTitleCase(address.town) : '',
                                county: address.county !== null && address.county !== 'undefined' && address.county !== undefined ? address.county : '',
                                postcode:  postcode.normalise()
                            });
                        });
                    }
                    //todo: remove this from session, better to write it to the page as a hidden block than to risk polluting the session with a massive block of json
                    req.session.addresses = addresses;

                    return res.render('address_pages/UKAddressSelect.ejs', {
                        initial: req.session.initial,
                        user:user,
                        account:account,
                        url:envVariables,
                        addresses: addresses,
                        postcode: postcode.normalise(),
                        error_report:req.flash('error')
                    });


                },
                    function(err)
                    {
                        console.log(err)
                        req.flash('error', 'Enter your address manually instead');
                        return res.render('address_pages/UKAddressSelect.ejs', {
                            initial: req.session.initial,
                            user:user,
                            account:account,
                            url:envVariables,
                            addresses: false,
                            postcode: postcode.normalise(),
                            error_report:req.flash('error'),
                            error_heading:'Postcode search is not available at the moment'
                        });
                        return  res.view("address_pages/UKAddressSelect.ejs",options);
                    }
                    );
            }
        });
    });
};

/**
 * ajaxFindPostcode - Takes a postcode input and returns addresses
 * 1. function compileAddresses():
 *      1.1. Uses LocationService.postcodeLookup function
 *      1.2. Organises the resulting list
 * 2. Adds addresses to user_addresses session variable- for use later
 * 3. Prepare options and return UK address select view
 * @return results
 */
module.exports.ajaxFindPostcode = function(req,res) {
    var address_type = req.body.address_type;
    if(!req.body){
        return res.redirect('your-'+address_type+'-address-uk?is_uk=true');
    }
    var Postcode = require("postcode");
    var postcode = new Postcode(req.body['find-postcode'].replace(/ /g,''));

    if(!postcode.valid()){
        return  res.json({error:'Enter a valid postcode'});
    }else {
        postcodeLookup(postcode.normalise()).then(function (results) {
            var return_error = false;
            var addresses = [];
            if (JSON.parse(results).message == 'No matching address found: no response') {
                req.flash('error', 'No addresses found');
                addresses = false;
            } else {
                var jsonResults = JSON.parse(results);
                addresses = [];
                jsonResults.forEach(function (address) {


                    var fullAddress = '';
                    fullAddress += address.organisation ? address.organisation + ', ' : '';
                    fullAddress += address.house_name   ? address.house_name + ', ' : '';
                    fullAddress += address.street       ? address.street + ', ' : '';
                    fullAddress += address.town         ? toTitleCase(address.town)  : '';
                    fullAddress += address.county       ?  ', '+address.county : '';


                    function toTitleCase(str) {
                        return str.replace(/\w\S*/g, function (txt) {
                            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                        });
                    }

                    addresses.push({
                        option: fullAddress,
                        organisation: address.organisation,
                        house_name: address.house_name,
                        street: address.street !== null && address.street !== 'undefined' && address.street !== undefined ? address.street : '',
                        town: address.town !== null && address.town !== 'undefined' && address.town !== undefined ? toTitleCase(address.town) : '',
                        county: address.county !== null && address.county !== 'undefined' && address.county !== undefined ? address.county : '',
                        postcode:  postcode.normalise()
                    });
                });
            }
            //todo: remove this from session, better to write it to the page as a hidden block than to risk polluting the session with a massive block of json
            req.session.addresses = addresses;
            return res.json( {error:return_error, addresses: addresses, postcode:  postcode.normalise()});
        },
        function(err)
        {
            console.log(err)
            return res.json({error:'Enter your address manually instead'});
        });
    }
};

module.exports.ajaxSelectAddress= function(req,res) {
    Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
        Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(account) {
            return res.json({
                full_name: account.first_name+' '+account.last_name, address: req.session.addresses[req.param('chosen')]
            });
        });
    });
};

module.exports.selectAddress= function(req,res) {
    var formValues = '';
    if(!req.method){
        return res.redirect('/api/user/add-address-uk?is_uk=true');
    }else if(!req.body.address){
        req.flash('error','Pick an address');
        return res.redirect('/api/user/find-your-address?postcode='+req.session.addresses[0].postcode);
    }

    Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
        Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(account){
            formValues = {
                full_name: account.first_name + " " + account.last_name,
                organisation: req.session.addresses[req.body.address].organisation,
                house_name: req.session.addresses[req.body.address].house_name,
                street: req.session.addresses[req.body.address].street,
                town: req.session.addresses[req.body.address].town,
                county: req.session.addresses[req.body.address].county,
                postcode: req.session.addresses[req.body.address].postcode
            };

            return res.render('address_pages/UKAddress.ejs', {
                uk: true,
                addresses: req.session.addresses,
                form_values: formValues,
                error_report: false,
                show_fields:true,
                manual:false,
                postcodeFlash: req.flash('error'),
                step: 2,
                user:user,
                initial: req.session.initial,
                account:account,
                postcode: req.session.addresses[req.body.address].postcode,
                chosen_address: req.body.address,
                url:envVariables
            });
        });
    });

};

module.exports.showManualAddress = function(req, res) {
    Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
        Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(account){
            return res.render('address_pages/UKManualAddress.ejs', {
                error_report: false,
                initial: req.session.initial,
                user:user,
                account:account,
                url:envVariables,
                form_values: false
            });
        });
    });
};

module.exports.saveAddress= function(req,res) {
    Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
        Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(account){
            var country = req.body.country || '';
            var Postcode = require("postcode");
            var postcodeObject = new Postcode(req.body.postcode.replace(/ /g,''));
            var postcode = ' ';
            if(country!='United Kingdom' ){
                postcode =  req.body.postcode.trim().length===0 ? ' ' : req.body.postcode.length > 1 ? req.body.postcode : postcode;
            }
            else{
                postcode =  postcodeObject.valid() ? postcodeObject.normalise() :'';
            }


            if(!req.body.house_name ||  req.body.house_name.length===0){
                if(req.body.organisation && req.body.organisation.length>0 && req.body.organisation != 'N/A'){
                    req.body.house_name = 'N/A';
                }
            }

            Model.SavedAddress.create({
                user_id: user.id,
                full_name: req.body.full_name,
                organisation: req.body.organisation,
                house_name: req.body.house_name,
                street: req.body.street,
                town:req.body.town,
                county:req.body.county || '',
                postcode:postcode,
                country: req.body.country || ''
            }).then(function(){
                if(req.session.initial===true){
                    req.session.initial=false;
                    return res.redirect('/api/user/dashboard?complete=true');
                }else {
                    return res.redirect('/api/user/addresses');
                }
            })
                .catch(Sequelize.ValidationError, function (error) {
                    return getCountries().then(function (countries) {
                        ValidationService.buildAddressErrorArray(error, req, res, countries,user, account);
                        return null;
                    });
                });
        });
    });

};

module.exports.showEditAddress= function(req,res) {
    Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
        Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(account){
            Model.SavedAddress.findOne({where:{user_id:user.id, id:req.query.id}}).then(function(address) {
                if (!address)
                {
                    console.log("Address is null")
                    return res.redirect('/api/user/addresses');
                }
                return getCountries().then(function (countries) {
                    return res.render('address_pages/edit-address.ejs', {
                        initial: req.session.initial,
                        user: user,
                        account: account,
                        url: envVariables,
                        form_values: address,
                        address_id: req.query.id,
                        uk: address.country == 'United Kingdom',
                        addresses: req.session.addresses,
                        error_report: false,
                        show_fields: true,
                        manual: false,
                        postcodeFlash: req.flash('error'),
                        countries:countries[0]
                    });
                });
            });
        });
    });
};

module.exports.editAddress= function(req,res) {
    var country = req.body.country || '';
    var Postcode = require("postcode");
    var postcodeObject = new Postcode(req.body.postcode.replace(/ /g,''));
    var postcode = ' ';
    if(country!='United Kingdom' ){
        postcode =  req.body.postcode.trim().length===0 ? ' ' : req.body.postcode.length > 1 ? req.body.postcode : postcode;
    }
    else{
        postcode =  postcodeObject.valid() ? postcodeObject.normalise() :'';
    }



    if(!req.body.house_name ||  req.body.house_name.length===0){
        if(req.body.organisation && req.body.organisation.length>0 && req.body.organisation != 'N/A'){
            req.body.house_name = 'N/A';
        }
    }

    Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
        Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(account){
            Model.SavedAddress.update({
                full_name: req.body.full_name,
                organisation: req.body.organisation,
                house_name: req.body.house_name,
                street: req.body.street,
                town:req.body.town,
                county:req.body.county,
                postcode:postcode,
                country: req.body.country
            },{where:{  user_id: user.id, id:req.body.address_id }
            }).then(function(){
                return res.redirect('/api/user/addresses');
            })
                .catch(Sequelize.ValidationError, function (error) {
                    console.log(error);
                    return getCountries().then(function (countries) {
                        ValidationService.buildAddressErrorArray(error, req, res, countries,user, account,true);
                        return null;
                    });
                });
        });
    });

};

module.exports.deleteAddress= function(req,res) {
    Model.SavedAddress.destroy({where:{id:req.query.id}}).then(function() {
        req.flash('info','Address successfully deleted');
        return res.redirect('/api/user/addresses');
    });

};


function postcodeLookup(postcode) {
    var rp = require('request-promise');
    var options = JSON.parse(JSON.stringify(envVariables.postcodeLookUpApiOptions));
    console.log("options uri: " + options.uri)
    console.log("options time: " + options.timeout)

    return rp({
            uri: options.uri+postcode,
            timeout: options.timeout
        },
        function(err){
            console.log(err)
        });
}

function getCountries() {
    countriesSQL = 'SELECT  name, casebook_mapping FROM "country" ORDER BY name ASC ';
    return envVariables.serviceSequelize.query(countriesSQL);
}
