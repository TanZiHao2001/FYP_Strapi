'use strict';

/**
 * vendor controller
 */

const {sanitize} = require('@strapi/utils')
const {contentAPI} = sanitize;
const {createCoreController} = require('@strapi/strapi').factories;
const {getVendorIdFromToken} = require("../../jwt_helper");
const createError = require("http-errors");
const cookie = require("cookie");
const {errorHandler} = require("../../error_helper");

module.exports = createCoreController('api::vendor.vendor', ({strapi}) => ({
  async find(ctx) {
    try {
      const parsedCookies = cookie.parse(ctx.request.header.cookie || "");
      const accessToken = parsedCookies?.accessToken;

      const vendorId = await getVendorIdFromToken('accessToken', accessToken);
      if (!vendorId) {
        throw createError.Unauthorized();
      }

      const contentType = strapi.contentType('api::vendor.vendor')
      const entry = await strapi.entityService.findOne('api::vendor.vendor', vendorId, {
        fields: ['username', 'organisation', 'email']
      });
      const result = await contentAPI.output(entry, contentType);
      return result;
    } catch (error) {
      await errorHandler(ctx, error);
    }
  }
}));
