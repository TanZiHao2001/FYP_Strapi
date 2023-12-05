const { sanitize } = require("@strapi/utils");
const { contentAPI } = sanitize;
// const cookie = require("cookie");
// const { getVendorIdFromToken } = require("../../jwt_helper");
const createError = require("http-errors");
const { errorHandler } = require("../../error_helper");

module.exports = {
    getAnnouncementList: async (ctx) => {
      try {
        ctx.request.query = {
            fields: ["isActive", "title", "createdAt", "updatedAt"],
            publicationState: 'live',
        };
  
        const contentType = strapi.contentType(
            "api::announcement.announcement"
        );
  
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
        errorHandler(ctx, error)
      }
    }
  };