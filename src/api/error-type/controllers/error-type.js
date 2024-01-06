"use strict";

const { errorHandler } = require("../../error_helper");
const createError = require("http-errors");
const cookie = require("cookie");
const { getVendorIdFromToken, checkAccessVendor } = require("../../jwt_helper");
/**
 * error-type controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::error-type.error-type", ({ strapi }) => ({
    async find(ctx) {
      try {
        const vendorId = await checkAccessVendor(ctx)
        if (!vendorId) {
          throw createError.Unauthorized();
        }

        const http_status_code = await strapi.entityService.findMany('api::error-type.error-type', {
            fields: ["code", "description"],
            publicationState: 'live',
        })
        return http_status_code
      } catch (error) {
        await errorHandler(ctx, error);
      }
    },
  })
);
