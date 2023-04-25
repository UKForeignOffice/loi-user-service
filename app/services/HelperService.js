const common = require("../../config/common");
const envVariables = common.config();
const axios = require("axios");
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3000 });

const HelperService = {

    getEdmsAccessToken: async function getEdmsAccessToken() {
        const cacheKey = 'access_token';
        const cachedToken = cache.get(cacheKey);

        if (cachedToken) {
            console.log('Returning access token from cache');
            return cachedToken;
        }

        try {
            const cognito_app_client_id = envVariables.edmsBearerToken['cognito_app_client_id'];
            const cognito_app_client_secret = envVariables.edmsBearerToken['cognito_app_client_secret'];
            const token = Buffer.from(`${cognito_app_client_id}:${cognito_app_client_secret}`).toString('base64');

            const response = await axios({
                method: 'POST',
                url: envVariables.edmsAuthHost,
                headers: {
                    'Authorization': `Basic ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: `grant_type=client_credentials&scope=${envVariables.edmsAuthScope}`
            });

            const { access_token } = response.data;
            cache.set(cacheKey, access_token);
            console.log('Returning access token from EDMS');
            return access_token;
        } catch (error) {
            console.error('Error fetching access token from EDMS:', error);
            throw error;
        }
    },

};

module.exports = HelperService;