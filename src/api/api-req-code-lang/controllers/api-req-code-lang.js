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
            // const result = await strapi.entityService.findMany('api::api-req-code-lang.api-req-code-lang', {
            //     distinct: ["lang_name"],
            //     fields: ["lang_name"]
            // })
            // const contentType = strapi.contentType("api::api-req-code-lang.api-req-code-lang");
            // const sanitizedResult = await sanitize.contentAPI.output(result, contentType);
            const result = await strapi.db.connection.raw( 'SELECT DISTINCT lang_name FROM api_req_code_langs' ); 
            // console.log(result[0])
            // const langNames = result[0].map(item => item.lang_name);
            // console.log(langNames)
            // const lang_name = result[0]
            return result[0];
        } catch(error){
            await errorHandler(ctx, error);
        }
    }
}));
