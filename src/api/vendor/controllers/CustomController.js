const cookie = require("cookie");
const {getVendorIdFromToken} = require("../../jwt_helper");
const createError = require("http-errors");
const {errorHandler} = require("../../error_helper");
const {sanitize} = require("@strapi/utils");
const {contentAPI} = sanitize;

module.exports = {
  async updateProfile(ctx) {
    try {
      const parsedCookies = cookie.parse(ctx.request.header.cookie || "");
      const accessToken = parsedCookies?.accessToken;

      const vendorId = await getVendorIdFromToken('accessToken', accessToken);
      if (!vendorId) {
        throw createError.Unauthorized();
      }

      const {username} = ctx.request.body;

      await strapi.entityService.update('api::vendor.vendor', vendorId, {
        data: {
          username: username
        },
      });

      return {message: 'Successfully Updated'};
    } catch (error) {
      await errorHandler(ctx, error);
    }
  }
};
