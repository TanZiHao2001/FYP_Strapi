const { sanitize } = require("@strapi/utils");
const { contentAPI } = sanitize;
const cookie = require("cookie");
const { getVendorIdFromToken } = require("../../jwt_helper");
const createError = require("http-errors");
const { errorHandler } = require("../../error_helper");

module.exports = {
    getAllApiCategory: async (ctx) => {
        try {
          ctx.request.query = {
            fields: ['category_name', 'image_url'],
            publicationState: 'live',
            populate: {
              api_collections: {
                fields: ['api_collection_name', 'createdAt', 'short_description'],
                publicationState: 'live',
                populate: {
                  api_ids: {
                    fields: ['id'],
                  }
                }
              }
            }
          }
          const contentType = strapi.contentType("api::api-category.api-category");
    
          const sanitizedQueryParams = await contentAPI.query(
            ctx.query,
            contentType
          );
    
          const entities = await strapi.entityService.findMany(
            contentType.uid,
            sanitizedQueryParams
          );
    
          const result = await contentAPI.output(entities, contentType);
    
          result.forEach(api_cat => {
            api_cat.api_collections.forEach(api_coll => {
              api_coll.count = api_coll.api_ids.length;
              delete api_coll.api_ids;
            })
          });
    
          return result;
        } catch (error) {
          await errorHandler(ctx, error)
        }
    },
    createApiCategory: async (ctx) => {
        try {
            const {category_name, image_url} = ctx.request.body;
            const entry = await strapi.entityService.create("api::api-category.api-category", {
                data: {
                    category_name: category_name,
                    image_url: image_url,
                    publishedAt: Date.now(),
                  },
            })
            ctx.send({message: `Api Category ${entry.category_name} created`})
        }   catch (error) {
            await errorHandler(ctx, error)
        }
    },
}