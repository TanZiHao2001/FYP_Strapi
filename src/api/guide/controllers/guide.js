"use strict";

/**
 * guide controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const { sanitize } = require("@strapi/utils");
const { contentAPI } = sanitize;
const createError = require("http-errors");
const {errorHandler} = require('../../error_helper');

module.exports = createCoreController("api::guide.guide", ({ strapi }) => ({
  async find(ctx) {
    try {
      ctx.request.query = {
        publicationState: 'live',
        fields: ["id", "guide_name", "answer"],
      };
      const contentType = strapi.contentType("api::guide.guide");
      const sanitizedQueryParams = await contentAPI.query(
        ctx.query,
        contentType
      );
      const entities = await strapi.entityService.findMany(
        contentType.uid,
        sanitizedQueryParams
      );
      const result = await contentAPI.output(entities, contentType);
      return result;    
    } catch (error) {
      await errorHandler(ctx, error)
    }
  },
}));
