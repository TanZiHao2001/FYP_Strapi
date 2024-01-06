"use strict";

const { errorHandler } = require("../../error_helper");
const createError = require("http-errors");
const cookie = require("cookie");
const { getVendorIdFromToken, checkAccessVendor } = require("../../jwt_helper");
/**
 * http-status-code controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::http-status-code.http-status-code", ({ strapi }) => ({
    async find(ctx) {
      try {
        const vendorId = await checkAccessVendor(ctx)
        if (!vendorId) {
          throw createError.Unauthorized();
        }

        const http_status_code = await strapi.entityService.findMany('api::http-status-code.http-status-code', {
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
