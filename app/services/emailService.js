const axios = require('axios');
const common = require('../../config/common.js');
const envVariables = common.config();

const emailService = {
  async sendOneTimePasscodeEmail(oneTimePasscode, email, userId) {
    const url = '/one_time_passcode_email';
    const postData = { to: email, oneTimePasscode: oneTimePasscode };
    sendRequest(url, postData, userId, 'One time passcode email sent');
  },

  async sendOneTimePasscodeSMS(oneTimePasscode, phoneNumber, userId) {
    const url = '/one_time_passcode_sms';
    const postData = { to: phoneNumber, oneTimePasscode: oneTimePasscode };
    sendRequest(url, postData, userId, 'One time passcode SMS sent');
  },

  async lockedOut(name, email) {
    const url = '/account_locked';
    const postData = { to: email, name: name };
    sendRequest(url, postData, '', 'Locked out email sent');
  },

  async resetPassword(email, token) {
    const url = '/reset-password';
    const postData = { to: email, token: token };
    console.log('test reset password');
    sendRequest(url, postData, '', 'Reset password email sent');
  },

  async confirmPasswordChange(name, email) {
    const url = '/password-updated';
    const postData = { to: email, name: name };
    sendRequest(url, postData, '', 'Confirm password email sent');
  },

  async emailConfirmation(email, token) {
    const url = '/confirm-email';
    const postData = { to: email, token: token };
    sendRequest(url, postData, '', 'Activation email sent');
  },

  async expiryWarning(email, accountExpiryDateText, dayAndMonthText, userID) {
    const url = '/expiry_warning';
    const postData = { to: email, accountExpiryDateText, dayAndMonthText };
    sendRequest(url, postData, userID, 'Expiry warning email sent');
  },

  async expiryConfirmation(email, userID) {
    const url = '/expiry_confirmation';
    const postData = { to: email };
    sendRequest(url, postData, userID, 'Expiry confirmation email sent');
  },

  async requestPremiumAccess(emailData) {
    const url = '/request-premium-access';
    sendRequest(url, emailData, emailData.userID, 'Premium service application request sent');
  },

  async premiumServiceDecision(emailData, decision) {
    const url = '/premium-service-decision';
    const postData = { to: emailData.email, decision: decision };
    const message =
      decision === 'approve'
        ? 'Premium service access approval email sent'
        : 'Premium service access rejection email sent';
    sendRequest(url, postData, emailData.id, message);
  },
};

async function sendRequest(url, postData, userId, message) {
  try {
    const response = await axios.post(envVariables.notificationServiceURL + url, postData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log(`${response.status} - ${message} for user ${userId}`);
  } catch (error) {
    console.error(error);
  }
}

module.exports = emailService;
