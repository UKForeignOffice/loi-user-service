var  common = require('../../config/common.js'),
    envVariables = common.config();

var ValidationService = {
    validateForm: function (inputs) {
        var errors = inputs.error.errors;

        var erroneousFields = inputs.erroneousFields;
        var errMsgs = [];

        var fieldName;
        var fieldError;
        var fieldSolution;
        var questionId;

        fieldsAndErrors = [];

        if (errors.length > 0) {
            for (var h = 0; h < errors.length; h++) {
                var errArr = JSON.parse(errors[h].message);

                fieldName = errArr[0].questionId;
                fieldError = errArr[0].errInfo;
                fieldSolution = errArr[0].errSoltn;
                questionId = errArr[0].questionId;

                errMsgs.push(
                    {
                        fieldName: fieldName,
                        fieldError: fieldError,
                        fieldSolution: fieldSolution,
                        questionId: questionId
                    }
                );
            }

            fieldsAndErrors.push([{errMsgs: errMsgs}]);
            fieldsAndErrors.push([{erroneousFields: erroneousFields}]);
        }
        return fieldsAndErrors;
    },

    buildErrorsArray: function (errorArr) {
        fieldsAndErrorsCustom = [];
        errornousFields = [];
        try {
            errorArr.errors.forEach(function (item) {
                if (errornousFields.indexOf(item.path) === -1) {

                    errornousFields.push(item.path);
                    if (item.path === 'password') {
                        /**
                         * If it IS the password fields with an error, build the
                         * errors array
                         */
                        var passwordError = item.message;

                        if (errornousFields.length === 1 && errornousFields.indexOf('password') > -1) {
                            passwordError = JSON.parse(passwordError)[0];
                        }

                        fieldsAndErrorsCustom.push({
                            fieldName: passwordError.questionId,
                            fieldError: passwordError.errInfo,
                            fieldSolution: passwordError.errSoltn,
                            questionId: passwordError.questionId
                        });

                    } else if (item.type === 'unique violation') {
                        /**
                         * Error due to duplicate email used
                         */
                        var emailError = item.message;

                        //if (errornousFields.length === 1 && errornousFields.indexOf('email') > -1) {
                        //    emailError = JSON.parse(emailError);
                        //}

                        fieldsAndErrorsCustom.push({
                            fieldName: emailError.questionId,
                            fieldError: emailError.errInfo,
                            fieldSolution: emailError.errSoltn,
                            questionId: emailError.questionId
                        });

                    } else {
                        /**
                         * If it IS NOT the password fields with an error, take
                         * error details from model
                         */
                        fieldsAndErrorsCustom.push({
                            fieldName: item.path,
                            fieldError: item.value.errInfo,
                            fieldSolution: item.value.errSoltn,
                            questionId: item.value.questionId
                        });
                    }


                }
            });

            fieldsAndErrorsCustom.push(errornousFields);
            //fieldsAndErrorsCustom.push({erroneousFields: erroneousFields});

            return fieldsAndErrorsCustom;
        } catch (error) {
            console.log('there was an error in the builderrorsarray ', error);
            //sails.log(error);
        }
    },


    buildAddressErrorArray: function (error, req, res, countries,user, account,edit) {
        var country = req.body.country || '';
        var mobilePattern = /^(\+|\d|\(|\#| )(\+|\d|\(| |\-)([0-9]|\(|\)| |\-){6,25}$/;
        var phonePattern = /^(\+|\d|\(|\#| )(\+|\d|\(| |\-)([0-9]|\(|\)| |\-){6,25}$/;
            //old phone pattern /([0-9]|[\-+#() ]){6,}/;
        var isemail = require('isemail');
        var Postcode = require("postcode");
        var postcodeObject = Postcode.toNormalised(req.body.postcode);
        var postcode = ' ';
        if(country!='United Kingdom' ){
            postcode =  req.body.postcode.trim().length===0 ? ' ' : req.body.postcode.length > 1 ? req.body.postcode : postcode;
        }
        else{
            postcode =  (postcodeObject) ? postcodeObject : ''
        }
        erroneousFields = [];
        if (req.body.full_name === '' || req.body.full_name.length <2) {
            erroneousFields.push('full_name');
        }
        if (postcode === '' || postcode.length >20 ) {
            erroneousFields.push('postcode');
        }
        if (req.body.house_name === '') {
            erroneousFields.push('house_name');
        }
        if (req.body.street === '') {
            erroneousFields.push('street');
        }
        if (req.body.town === '') {
            erroneousFields.push('town');
        }
        if (req.body.country === '' || typeof(req.body.country)=='undefined') {
            erroneousFields.push('country');
        }
        if (req.body.mobileNo === '' || req.body.mobileNo.length < 6 || req.body.mobileNo.length > 25 || !mobilePattern.test(req.body.mobileNo)) {
            erroneousFields.push('mobileNo');
        }
        if (req.body.telephone !== null && req.body.telephone !== '') {
            if (req.body.telephone.length < 6 || req.body.telephone.length > 25 || !phonePattern.test(req.body.telephone)) {
                erroneousFields.push('telephone');
            }
        }

        if (req.body.email !== '') {
            if (!isemail.validate(req.body.email)){
                erroneousFields.push('email');
            }
        }

        var dataValues = [];
        dataValues.push(
            {
                full_name: req.body.full_name !== '' && req.body.full_name !== undefined && req.body.full_name != 'undefined'  ? req.body.full_name : "",
                postcode:  postcode,
                organisation: req.body.organisation !== '' && req.body.organisation !== undefined && req.body.organisation != 'undefined' ? req.body.organisation : "",
                house_name: req.body.house_name !== '' && req.body.house_name !== undefined && req.body.house_name != 'undefined' ? req.body.house_name : "",
                street: req.body.street !== '' && req.body.street !== undefined && req.body.street != 'undefined'  ? req.body.street : "",
                town: req.body.town !== '' && req.body.town !== undefined && req.body.town != 'undefined'  ? req.body.town : "",
                county: req.body.county !== '' && req.body.county !== undefined && req.body.county != 'undefined'  ? req.body.county : "",
                country: req.body.country !== '' && req.body.country !== undefined && req.body.country != 'undefined'  ? req.body.country : "",
                telephone: req.body.telephone !== '' && req.body.telephone !== undefined && req.body.telephone != 'undefined'  ? req.body.telephone : "",
                mobileNo: req.body.mobileNo !== '' && req.body.mobileNo !== undefined && req.body.mobileNo != 'undefined'  ? req.body.mobileNo : "",
                email: req.body.email !== '' && req.body.email !== undefined && req.body.email != 'undefined'  ? req.body.email : ""
            }
        );
        if(edit){
            var require_contact_details = 'no';
            var back_link = '';
            if (req.session.require_contact_details === 'yes'){
                require_contact_details = 'yes';
                back_link = req.session.require_contact_details_back_link;
            }
            return res.render('address_pages/edit-address.ejs', {
                uk: (req.body.country=='United Kingdom'),
                addresses: req.session.addresses,
                form_values: dataValues[0],
                address_id: req.body.address_id,
                error_report: ValidationService.validateForm({error: error, erroneousFields: erroneousFields}),
                show_fields:true,
                manual:true,
                postcodeFlash: req.flash('error'),
                step: 2,
                user:user,
                account:account,
                url:envVariables,
                countries: countries[0],
                initial:req.session.initial,
                require_contact_details:require_contact_details,
                back_link:back_link
            });

        }else if(req.body.country == 'United Kingdom' && !JSON.parse(req.body.manual)){
            return res.render('address_pages/UKAddress.ejs', {
                uk: true,
                addresses: req.session.addresses,
                form_values: dataValues[0],
                error_report: ValidationService.validateForm({error: error, erroneousFields: erroneousFields}),
                postcodeFlash: req.flash('error'),
                user: user,
                initial: req.session.initial,
                account: account,
                postcode: req.body.postcode,
                chosen_address: req.body.chosen_address,
                url: envVariables
            });
        }else if(req.body.country == 'United Kingdom' && JSON.parse(req.body.manual)) {
            return res.render('address_pages/UKManualAddress.ejs', {
                form_values: dataValues[0],
                error_report: ValidationService.validateForm({error: error, erroneousFields: erroneousFields}),
                user: user,
                initial: req.session.initial,
                account: account,
                url: envVariables
            });

        }else{
            return res.render('address_pages/IntlAddress.ejs', {
                form_values: dataValues[0],
                error_report: ValidationService.validateForm({error: error, erroneousFields: erroneousFields}),
                initial: req.session.initial,
                user:user,
                account:account,
                url:envVariables,
                countries:countries[0]
            });
        }
    }
};

module.exports = ValidationService;