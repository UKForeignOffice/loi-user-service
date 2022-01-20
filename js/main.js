var browser = {
    isIe: function () {
        return navigator.appVersion.indexOf("MSIE") != -1;
    },
    navigator: navigator.appVersion,
    getVersion: function() {
        var version = 999; // we assume a sane browser
        if (navigator.appVersion.indexOf("MSIE") != -1)
            // bah, IE again, lets downgrade version number
            version = parseFloat(navigator.appVersion.split("MSIE")[1]);
        return version;
    }
};

$(document).ready(function() {

//cookie banner

    $('#accept-all-cookies').click(function(event){
        if (browser.isIe() && browser.getVersion() <= 9) {
            return true;
        }
        GOVUK.approveAllCookieTypes();
        //remove cookie banner when called (button pressed)
    });

    $('#hide-confirmation').click(function(event){
        if (browser.isIe() && browser.getVersion() <= 9) {
            return true;
        }
        GOVUK.hideConfirmationBanner();
    });

    $('#preference-cookies').click(function(event){
        if (browser.isIe() && browser.getVersion() <= 9) {
            return true;
        }
        //redirects to cookie screen, could maybe be a new tab instead
        window.location ="/cookies";
    });

    $('#save-cookie-changes').click(function(event){
        if (browser.isIe() && browser.getVersion() <= 9) {
            return true;
        }
        //save selections onclick of save button
        GOVUK.savePreferencesSelected();
    });

    //Display cookie banner(if required)
    GOVUK.showCookieBanner();

    //set default/essential cookies if policy not set (user hasnt accepted all)
    if (!GOVUK.cookie('cookies_preferences_set')) {
        GOVUK.setDefaultConsentCookie();
    }
    //disable matomo if required
    GOVUK.disableMatomo(GOVUK.getConsentCookie());

    //------end of cookies

// end cookie banner


    $('.no-js-show').removeClass('no-js-show');

    var $email = $('#email');
    var $email_hint = $("#email_hint");
    var $confirm_email = $('#email-confirm');
    var $confirm_email_hint = $("#confirm_email_hint");


    $email.on('blur', function () {
        $email_hint.css('display', 'none').empty();
        $(this).mailcheck({
            domains: customDomains,                       // optional
            secondLevelDomains: customSecondLevelDomains, // optional
            suggested: function (element, suggestion) {
                if (!$email_hint.html()) {
                    // First error - fill in/show entire hint element
                    var suggestionMessage = "Did you mean <span class='suggestion'>" +
                        "<a href='#' class='domain'>" +
                        "<span class='address'>" + suggestion.address + "</span>" +
                        "@" + suggestion.domain +
                        "</a></span>?";

                    $email_hint.html(suggestionMessage).fadeIn(150);
                } else {
                    // Subsequent errors
                    $(".address").html(suggestion.address);
                    $(".domain").html(suggestion.domain);
                }
            }
        });
    });


    $email_hint.on('click', '.domain', function () {
        // On click, fill in the field with the suggestion and remove the hint
        $email.val($(".suggestion").text());
        $email_hint.fadeOut(200, function () {
            $(this).empty();
        });
        return false;
    });


    $('body').on('click', '.help-content-link',function(e) {
        e.preventDefault();
        $(this).next(".help-content-body").toggle();
        $(this).toggleClass("icon-toggle-right icon-toggle-down");
    })
        .on('click','.collapsible', function(){
            $('.collapsible span').html('click to expand');
            $("#sr-notification-container").empty().text('Help collapsed');
            $(this).removeClass('collapsible').addClass('expandable');
        })
        .on('click','.expandable', function(){
            $('.expandable span').html('click to collapse');
            $("#sr-notification-container").empty().text('Help expanded, content can be found below');
            $(this).removeClass('expandable').addClass('collapsible');
        });

});

$('#find-address').click(function(event){
    if (browser.isIe() && browser.getVersion() <= 9) {
        return true;
    }
    event.preventDefault();
    $.ajaxSetup({
        headers: {
            'csrf-token': $('#find-address').data('csrf')
        },
    });
    $.post("/api/user/ajax-find-your-address",
        {address_type: $('input[name="address_type"]').val(), "find-postcode": $('#find-postcode').val()},
        function (data, status) {
            if(data.error || data.addresses===false){
                $("#sr-notification-container").empty().text("The postcode entered was invalid. Enter a valid postcode.");
                showPostCodeError(data.error);
                clearResultAddresses();
            }else{
                $('#postcode-error').addClass('hide');
                $("#sr-notification-container").empty().text("The postcode search was successful results are shown below.");
                showResultAddresses(data.addresses);
            }
        });

});


function showPostCodeError(error){
    if (error === 'Enter your address manually instead'){
        var html = '<h2 class="heading-medium error-summary-heading" id="error-summary-heading">Postcode search is not available at the moment</h2>' +
            '<ul class="govuk-list govuk-error-summary__list"><li><a href="/api/user/your-address-manual">'+error+'</a></li></ul>';
        $('#postcode-error').removeClass('hide').html(html);
    }else{
        var html = '<h2 class="heading-medium error-summary-heading" id="error-summary-heading">There is a problem</h2>' +
            '<ul class="govuk-list govuk-error-summary__list"><li><a href="#find-postcode">'+error+'</a></li></ul>';
        $('#postcode-error').removeClass('hide').html(html);
    }

}

function clearResultAddresses(){
    $('#address-list-group').addClass('hide');
    $('#address-list-box')
        .empty();
}

function showResultAddresses(addresses){
    $('#address-list-group').removeClass('hide');
    $('#address-list-box')
        .empty()
        .append($("<option></option>")
            .text('Pick an address')
            .attr('disabled','true')
            .attr('selected','true')
        );
    for(var i=0;i<addresses.length;i++){
        $('#address-list-box')
            .append($("<option></option>")
                .attr("value",i)
                .text(addresses[i].option)
            );
    }
}


$('#address-list-box').change(function(){
    if (browser.isIe() && browser.getVersion() <= 9) {
        $('#select-address-button-div').removeClass('hide').removeClass('js-hidden');
        return true;
    }

    $.ajaxSetup({
      headers: {
        'csrf-token': $('#address-list-box').data('csrf'),
      },
    });

    $.post("/api/user/ajax-select-your-address",
        {address_type: $('input[name="address_type"]').val(),chosen:$('#address-list-box').val()},
        function (data, status) {
            console.log('DATA:', data);
            console.log('Status:', status);
            $("#sr-notification-container").empty().text("The address you've selected has been added to the form. Submit to continue.");
            $('#uk-address-form').removeClass('hide');
            $('input[name="full_name"]').val(data.full_name);
            $('input[name="organisation"]').val(data.address.organisation || '');
            $('input[name="house_name"]').val(data.address.house_name);
            $('input[name="street"]').val(data.address.street);
            $('input[name="town"]').val(data.address.town);
            $('input[name="county"]').val(data.address.county);
            $('input[name="postcode"]').val(data.address.postcode);
            $('#disabled-button').addClass('hide');

        });

});
