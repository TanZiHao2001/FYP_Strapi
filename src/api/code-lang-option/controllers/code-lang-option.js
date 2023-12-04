'use strict';

const {getVendorIdFromToken} = require("../../jwt_helper");
const createError = require("http-errors");
const {errorHandler} = require("../../error_helper");
const {sanitize} = require('@strapi/utils')
const {contentAPI} = sanitize;
const cookie = require("cookie");
/**
 * code-lang-option controller
 */

const {createCoreController} = require('@strapi/strapi').factories;

module.exports = createCoreController('api::code-lang-option.code-lang-option', ({strapi}) => ({
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

      ctx.request.query = {
        fields: ["Label", 'LanguageCode','iconUrl'],
        publicationState: 'live',
      };

      const contentType = strapi.contentType("api::code-lang-option.code-lang-option");

      const sanitizedQueryParams = await contentAPI.query(
        ctx.query,
        contentType
      );

      const entities = await strapi.entityService.findMany(
        contentType.uid,
        sanitizedQueryParams
      );


      const result = await contentAPI.output(entities, contentType);
      const transformedData = result.map(item => ({
        "id": item.id,
        "label": item.Label,
        "value": item.LanguageCode,
        "option": item.iconUrl
      }));

      return transformedData;
    } catch (error) {
      await errorHandler(ctx, error);
    }
  }
}));
