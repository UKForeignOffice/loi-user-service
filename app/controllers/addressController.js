/**
 * FCO LOI User Management
 * Registration Controller
 *
 *
 */

const Model = require('../model/models.js'),
    ValidationService = require('../services/ValidationService.js'),
    common = require('../../config/common.js'),
    envVariables = common.config(),
    rp = require('request-promise');

const mobilePattern = /^(\+|\d|\(|\#| )(\+|\d|\(| |\-)([0-9]|\(|\)| |\-){6,25}$/;
const phonePattern = /^(\+|\d|\(|\#| )(\+|\d|\(| |\-)([0-9]|\(|\)| |\-){6,25}$/;


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
       showPostcodeLookup(req, res);
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
                        countries:countries[0],
                        contact_telephone:account.telephone,
                        contact_mobileNo:account.mobileNo,
                        contact_email:user.email
                    });
                });
            });
        });
    }
};

function showPostcodeLookup(req, res) {
  Model.User.findOne({ where: { email: req.session.email } }).then(function (user) {
    Model.AccountDetails.findOne({ where: { user_id: user.id } }).then(function (account) {
      return res.render('address_pages/UKAddressPostcodeEntry.ejs', {
        initial: req.session.initial,
        user: user,
        account: account,
        url: envVariables,
        error_report: req.flash('error'),
        contact_telephone: account.telephone,
        contact_mobileNo: account.mobileNo,
        contact_email: user.email,
      });
    });
  });
};

module.exports.showPostcodeLookup = showPostcodeLookup;

module.exports.findAddress= function(req,res) {
    const Postcode = require("postcode");
    let postcode = '';


    if(!req.query.postcode && !req.body['find-postcode']){
        return res.redirect('/api/user/add-address-uk?is_uk=true');
    }else if(req.query && req.query.postcode){
        postcode = Postcode.toNormalised(req.query.postcode)
    }else{
        postcode = Postcode.toNormalised(req.body['find-postcode'])
    }



    Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
        Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(account){
            if(!postcode){
                req.flash('error', 'Enter a valid postcode');
                return res.render('address_pages/UKAddressSelect.ejs', {
                    initial: req.session.initial,
                    user:user,
                    account:account,
                    url:envVariables,
                    addresses: false,
                    postcode: postcode,
                    error_report:req.flash('error')
                });
            }else {
                postcodeLookup(postcode).then(function (results) {
                    var addresses = [];
                    if (JSON.parse(results).message === 'No matching address found: no response') {
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
                                postcode:  postcode
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
                        postcode: postcode,
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
                            postcode: postcode,
                            error_report:req.flash('error'),
                            error_heading:'Postcode search is not available at the moment'
                        });
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
    const Postcode = require('postcode');
    const postcode = Postcode.toNormalised(req.body['find-postcode'])


    if(!postcode){
        return  res.json({error:'Enter a valid postcode'});
    }else {
        postcodeLookup(postcode).then(function (results) {
            var return_error = false;
            var addresses = [];
            if (JSON.parse(results).message === 'No matching address found: no response') {
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
                        postcode: postcode
                    });
                });
            }
            //todo: remove this from session, better to write it to the page as a hidden block than to risk polluting the session with a massive block of json
            req.session.addresses = addresses;
            return res.json( {error:return_error, addresses: addresses, postcode:  postcode});
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
            const chosenAddressIndex = req.body.chosen;
            return res.json({
                full_name: account.first_name + ' ' + account.last_name,
                address: req.session.addresses[chosenAddressIndex]
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
                form_values: false,
                contact_telephone:account.telephone,
                contact_mobileNo:account.mobileNo,
                contact_email:user.email
            });
        });
    });
};

module.exports.saveAddress= function(req,res) {
    Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
        Model.AccountDetails.findOne({where:{user_id:user.id}}).then(function(account){
            var country = req.body.country || '';
            var email = req.body.email || null;
            var telephone = req.body.telephone || null;
            var mobileNo = req.body.mobileNo;
            var Postcode = require("postcode");
            var postcodeObject = Postcode.toNormalised(req.body.postcode)
            var postcode = ' ';
            if(country!='United Kingdom' ){
                postcode =  req.body.postcode.trim().length===0 ? ' ' : req.body.postcode.length > 1 ? req.body.postcode : postcode;
            }
            else{
                postcode =  (postcodeObject) ? postcodeObject : '';
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
                country: req.body.country || '',
                telephone: (telephone !== null) ? phonePattern.test(telephone) ? telephone : '' : null,
                mobileNo: mobilePattern.test(mobileNo) ? mobileNo : '',
                email : email
            }).then(function(){
                if(req.session.initial===true){
                    req.session.initial=false;
                    console.log(`address successfully added for user ${user.id}`)
                    return res.redirect('/api/user/dashboard?complete=true');
                }else {
                    console.log(`address successfully added for user ${user.id}`)
                    return res.redirect('/api/user/addresses');
                }
            }).catch(function (error) {
                    return getCountries().then(function (countries) {
                        ValidationService.buildAddressErrorArray(error, req, res, countries, user, account);
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
                    console.log("Address is null");
                    return res.redirect('/api/user/addresses');
                }
                var require_contact_details = 'no';
                var back_link = '';

                // if the user has been sent here from the application
                // service because they need to update their telephone
                // numnber and email address, set some flags
                if (req.session.require_contact_details === 'yes'){
                    require_contact_details = 'yes';
                    back_link = req.session.require_contact_details_back_link;
                }

                // if there is no telephone or email found
                // pull them from their account so we can
                // pre-populate
                if (address.telephone === null){
                    address.telephone = account.telephone;
                }

                if (address.mobileNo === null){
                    address.mobileNo = account.mobileNo;
                }
                if (address.email === null){
                    address.email = user.email;
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
                        countries:countries[0],
                        require_contact_details:require_contact_details,
                        back_link:back_link
                    });
                });
            }).catch(function (error) {
                console.log(error);
                return res.redirect('/api/user/addresses');
            });
        });
    });
};

module.exports.editAddress= function(req,res) {
    var country = req.body.country || '';
    var email = req.body.email || null;
    var mobileNo = req.body.mobileNo;
    var telephone = req.body.telephone || null;
    var Postcode = require("postcode");
    var postcodeObject = Postcode.toNormalised(req.body.postcode)
    var postcode = ' ';
    if(country!='United Kingdom' ){
        postcode =  req.body.postcode.trim().length===0 ? ' ' : req.body.postcode.length > 1 ? req.body.postcode : postcode;
    }
    else{
        postcode =  (postcodeObject) ? postcodeObject : '';
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
                country: req.body.country,
                telephone: (telephone !== null) ? phonePattern.test(telephone) ? telephone : '' : null,
                mobileNo: mobilePattern.test(mobileNo) ? mobileNo : '',
                email: email
            },{where:{  user_id: user.id, id:req.body.address_id }
            }).then(function(){

                // enter this section if the user was sent here because they
                // didnt have any telephone or email associated with this
                // selected address
                if (req.session.require_contact_details === 'yes') {

                    req.session.addressToUpdate = {
                        full_name: req.body.full_name,
                        organisation: req.body.organisation,
                        house_name: req.body.house_name,
                        street: req.body.street,
                        town:req.body.town,
                        county:req.body.county,
                        postcode:postcode,
                        country: req.body.country,
                        telephone: (telephone !== null) ? phonePattern.test(telephone) ? telephone : '' : null,
                        mobileNo: mobilePattern.test(mobileNo) ? mobileNo : '',
                        email: email
                    };

                    // go back to the application-service and update details
                    // before being redirected to the correct page
                    return res.redirect(envVariables.applicationServiceURL + 'manage-saved-address');
                }else{
                    return res.redirect('/api/user/addresses');
                }
            })
                .catch(function (error) {
                    return getCountries().then(function (countries) {
                        ValidationService.buildAddressErrorArray(error, req, res, countries,user, account,true);
                        return null;
                    });
                });
        });
    });

};

module.exports.deleteAddress= function(req,res) {

        Model.User.findOne({where:{email:req.session.email}}).then(function(user) {
            Model.SavedAddress.destroy({where: {user_id:user.id, id: req.query.id}})
                .then(function (result) {

                    if(result == true)
                    {
                        console.log(`address successfully deleted for user ${user.id} and id ${req.query.id}`)
                        req.flash('info', 'Address successfully deleted');
                    }
                    else {
                        console.log(`address not deleted for user ${user.id} and id ${req.query.id}`)
                    }
                    return res.redirect('/api/user/addresses');
                })
                .catch(function (error) {
                    console.log(error);
                    return res.redirect('/api/user/addresses');
                });
        });

};

function postcodeLookup(normalisedPostcode) {
    const postcode = normalisedPostcode.replace(/ /g, '');
    const options = { ...envVariables.postcodeLookUpApiOptions, uri: envVariables.postcodeLookUpApiOptions.uri + postcode };

    return rp(options)
        .catch(err => {
            console.error(err);
        });
}

function getCountries() {
    countriesSQL = 'SELECT  name FROM "country" ORDER BY name ASC ';
    return envVariables.serviceSequelize.query(countriesSQL);
}
