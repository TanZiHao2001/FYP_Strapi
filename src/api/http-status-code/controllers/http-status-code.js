"use strict";

const { errorHandler } = require("../../error_helper");
const createError = require("http-errors");
const cookie = require("cookie");
const { getVendorIdFromToken } = require("../../jwt_helper");
/**
 * http-status-code controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::http-status-code.http-status-code", ({ strapi }) => ({
    async find(ctx) {
      try {
        const parsedCookies = cookie.parse(ctx.request.header.cookie || "");
        const accessToken = parsedCookies.accessToken;
        if (!accessToken) {
          throw createError.Unauthorized();
        }

        const vendorId = await getVendorIdFromToken("accessToken", accessToken);
        if (!vendorId) {
          throw createError.Unauthorized();
        }

        const http_status_code = await strapi.entityService.findMany('api::http-status-code.http-status-code', {
            fields: ["code", "description"]
        })
        return http_status_code
      } catch (error) {
        await errorHandler(ctx, error);
      }
    },
  })
);
