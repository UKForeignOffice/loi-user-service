
function ShowHideContent() {
    var self = this;


    self.escapeElementName = function(str) {
        result = str.replace('[', '\\[').replace(']', '\\]');
        return(result);
    };

    self.showHideRadioToggledContent = function () {
        $("input.govuk-radios__input[type=radio]").each(function () {

            var $radio = $(this);
            var $radioGroupName = $radio.attr('name');
            var $radioLabel = $radio.parent('label');

            //var dataTarget = $radioLabel.attr('data-target');
            var dataTarget = $radio.attr('data-target');

            // Add ARIA attributes

            // If the data-target attribute is defined
            if (dataTarget) {

                // Set aria-controls
                $radio.attr('aria-controls', dataTarget);
                $radio.on('click', function () {

                    // Select radio buttons in the same group
                    $radio.closest('form').find("input.govuk-radios__input[name=" + self.escapeElementName($radioGroupName) + "]").each(function () {
                        var $this = $(this);

                        var groupDataTarget = $this.parent('input').attr('data-target');
                        var $groupDataTarget = $('#' + groupDataTarget);

                        // Hide toggled content
                        $groupDataTarget.hide();
                        // Set aria-expanded and aria-hidden for hidden content
                        $this.attr('aria-expanded', 'false');
                        $groupDataTarget.attr('aria-hidden', 'true');
                    });

                    var $dataTarget = $('#' + dataTarget);
                    $dataTarget.show();
                    // Set aria-expanded and aria-hidden for clicked radio
                    $radio.attr('aria-expanded', 'true');
                    $dataTarget.attr('aria-hidden', 'false');

                    // added to handle /postage-return-options screen radio buttons with the new govuk-frontend buttons
                    if(dataTarget === "business-info-hide") {
                        $("#business-info").hide();
                    }
                    if(dataTarget === "mfa-mobile-number-hide") {
                        $("#mfa-mobile-number").hide();
                    }

                });

            } else {
                // If the data-target attribute is undefined for a radio button,
                // hide visible data-target content for radio buttons in the same group

                $radio.on('click', function () {

                    // Select radio buttons in the same group
                    $("input.govuk-radios__input[name=" + self.escapeElementName($radioGroupName) + "]").each(function () {

                        var groupDataTarget = $(this).parent('input').attr('data-target');
                        var $groupDataTarget = $('#' + groupDataTarget);

                        // Hide toggled content
                        $groupDataTarget.hide();
                        // Set aria-expanded and aria-hidden for hidden content
                        $(this).attr('aria-expanded', 'false');
                        $groupDataTarget.attr('aria-hidden', 'true');
                    });

                });
            }

        });
    };
    self.showHideCheckboxToggledContent = function () {

        $(".block-label input[type='checkbox']").each(function() {

            var $checkbox = $(this);
            var $checkboxLabel = $(this).parent();

            var $dataTarget = $checkboxLabel.attr('data-target');

            // Add ARIA attributes

            // If the data-target attribute is defined
            if (typeof $dataTarget !== 'undefined' && $dataTarget !== false) {

                // Set aria-controls
                $checkbox.attr('aria-controls', $dataTarget);

                // Set aria-expanded and aria-hidden
                $checkbox.attr('aria-expanded', 'false');
                $('#'+$dataTarget).attr('aria-hidden', 'true');

                // For checkboxes revealing hidden content
                $checkbox.on('click', function() {

                    var state = $(this).attr('aria-expanded') === 'false' ? true : false;

                    // Toggle hidden content
                    $('#'+$dataTarget).toggle();

                    // Update aria-expanded and aria-hidden attributes
                    $(this).attr('aria-expanded', state);
                    $('#'+$dataTarget).attr('aria-hidden', !state);

                });
            }

        });
    };
}
$(document).ready(function() {

    // Turn off jQuery animation
    jQuery.fx.off = true;

    // Use GOV.UK selection-buttons.js to set selected
    // and focused states for block labels
    if(window.location.pathname !== '/cookies')
    {
        var $blockLabels = $(".block-label input[type='radio'], .block-label input[type='checkbox']");

        new GOVUK.SelectionButtons($blockLabels);
    }
    // Details/summary polyfill
    // See /javascripts/vendor/details.polyfill.js

    // Where .block-label uses the data-target attribute
    // to toggle hidden content
    var toggleContent = new ShowHideContent();
    toggleContent.showHideRadioToggledContent();
    toggleContent.showHideCheckboxToggledContent();



});
// Stageprompt 2.0.1
//
// See: https://github.com/alphagov/stageprompt
//
// Stageprompt allows user journeys to be described and instrumented
// using data attributes.
//
// Setup (run this on document ready):
//
//   GOVUK.performance.stageprompt.setupForGoogleAnalytics();
//
// Usage:
//
//   Sending events on page load:
//
//     <div id="wrapper" class="service" data-journey="pay-register-birth-abroad:start">
//         [...]
//     </div>
//
//   Sending events on click:
//
//     <a class="help-button" href="#" data-journey-click="stage:help:info">See more info...</a>

var GOVUK = GOVUK || {};

GOVUK.performance = GOVUK.performance || {};

GOVUK.performance.stageprompt = (function () {

    var setup, setupForGoogleAnalytics, splitAction;

    splitAction = function (action) {
        var parts = action.split(':');
        if (parts.length <= 3) return parts;
        return [parts.shift(), parts.shift(), parts.join(':')];
    };

    setup = function (analyticsCallback) {
        var journeyStage = $('[data-journey]').attr('data-journey'),
            journeyHelpers = $('[data-journey-click]');

        if (journeyStage) {
            analyticsCallback.apply(null, splitAction(journeyStage));
        }

        journeyHelpers.on('click', function (event) {
            analyticsCallback.apply(null, splitAction($(this).data('journey-click')));
        });
    };

    setupForGoogleAnalytics = function () {
        setup(GOVUK.performance.sendGoogleAnalyticsEvent);
    };

    return {
        setup: setup,
        setupForGoogleAnalytics: setupForGoogleAnalytics
    };
}());

GOVUK.performance.sendGoogleAnalyticsEvent = function (category, event, label) {
    _gaq.push(['_trackEvent', category, event, label, undefined, true]);
};

(function () {
    "use strict";
    var root = this,
        $ = root.jQuery;

    if (typeof GOVUK === 'undefined') { root.GOVUK = {}; }

    var SelectionButtons = function (elmsOrSelector, opts) {
        var $elms;

        this.selectedClass = 'selected';
        this.focusedClass = 'focused';
        if (opts !== undefined) {
            $.each(opts, function (optionName, optionObj) {
                this[optionName] = optionObj;
            }.bind(this));
        }
        if (typeof elmsOrSelector === 'string') {
            $elms = $(elmsOrSelector);
            this.selector = elmsOrSelector;
            this.setInitialState($(this.selector));
        } else {
            this.$elms = elmsOrSelector;
            this.setInitialState(this.$elms);
        }
        this.addEvents();
    };
    SelectionButtons.prototype.addEvents = function () {
        if (typeof this.$elms !== 'undefined') {
            this.addElementLevelEvents();
        } else {
            this.addDocumentLevelEvents();
        }
    };
    SelectionButtons.prototype.setInitialState = function ($elms) {
        $elms.each(function (idx, elm) {
            var $elm = $(elm);

            if ($elm.is(':checked')) {
                this.markSelected($elm);
            }
        }.bind(this));
    };
    SelectionButtons.prototype.markFocused = function ($elm, state) {
        if (state === 'focused') {
            $elm.parent('label').addClass(this.focusedClass);
        } else {
            $elm.parent('label').removeClass(this.focusedClass);
        }
    };
    SelectionButtons.prototype.markSelected = function ($elm) {
        var radioName;

        if ($elm.attr('type') === 'radio') {
            radioName = $elm.attr('name');
            $($elm[0].form).find('input[name="' + radioName + '"]')
                .parent('label')
                .removeClass(this.selectedClass);
            $elm.parent('label').addClass(this.selectedClass);
        } else { // checkbox
            if ($elm.is(':checked')) {
                $elm.parent('label').addClass(this.selectedClass);
            } else {
                $elm.parent('label').removeClass(this.selectedClass);
            }
        }
    };
    SelectionButtons.prototype.addElementLevelEvents = function () {
        this.clickHandler = this.getClickHandler();
        this.focusHandler = this.getFocusHandler({ 'level' : 'element' });

        this.$elms
            .on('click', this.clickHandler)
            .on('focus blur', this.focusHandler);
    };
    SelectionButtons.prototype.addDocumentLevelEvents = function () {
        this.clickHandler = this.getClickHandler();
        this.focusHandler = this.getFocusHandler({ 'level' : 'document' });

        $(document)
            .on('click', this.selector, this.clickHandler)
            .on('focus blur', this.selector, this.focusHandler);
    };
    SelectionButtons.prototype.getClickHandler = function () {
        return function (e) {
            this.markSelected($(e.target));
        }.bind(this);
    };
    SelectionButtons.prototype.getFocusHandler = function (opts) {
        var focusEvent = (opts.level === 'document') ? 'focusin' : 'focus';

        return function (e) {
            var state = (e.type === focusEvent) ? 'focused' : 'blurred';

            this.markFocused($(e.target), state);
        }.bind(this);
    };
    SelectionButtons.prototype.destroy = function () {
        if (typeof this.selector !== 'undefined') {
            $(document)
                .off('click', this.selector, this.clickHandler)
                .off('focus blur', this.selector, this.focusHandler);
        } else {
            this.$elms
                .off('click', this.clickHandler)
                .off('focus blur', this.focusHandler);
        }
    };

    root.GOVUK.SelectionButtons = SelectionButtons;
}).call(this);
