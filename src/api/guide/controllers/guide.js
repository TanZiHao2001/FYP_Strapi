"use strict";

/**
 * guide controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const { sanitize } = require("@strapi/utils");
const { contentAPI } = sanitize;

module.exports = createCoreController("api::guide.guide", ({ strapi }) => ({
  async find(ctx) {
    try {
      ctx.request.query = {
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
      if (error) {
        // If it's a validation error
        ctx.response.status = 200; //initially 204
        ctx.response.body = { error: error.message };
      } else {
        // Handle other errors accordingly
        ctx.response.status = 200; //500
        ctx.response.body = { error: "Internal Server Error" };
      }
    }
  },
}));
