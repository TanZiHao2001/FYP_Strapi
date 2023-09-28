'use strict';

/**
 * api-req-code-lang controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const {sanitize} = require('@strapi/utils')
const {getVendorIdFromToken} = require("../../jwt_helper");
const {contentAPI} = sanitize;
const createError = require("http-errors");
const {errorHandler} = require('../../error_helper');

module.exports = createCoreController('api::api-req-code-lang.api-req-code-lang', ({ strapi}) => ({
    async find(ctx) {
        try{
            const result = await strapi.db.connection.raw( 'SELECT DISTINCT lang_name FROM api_req_code_langs' ); 
            return result[0];
        } catch(error){
            await errorHandler(ctx, error);
        }
    }
}));
