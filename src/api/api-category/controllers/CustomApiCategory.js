const { sanitize } = require("@strapi/utils");
const { contentAPI } = sanitize;
const cookie = require("cookie");
const { getVendorIdFromToken } = require("../../jwt_helper");
const createError = require("http-errors");
const { errorHandler } = require("../../error_helper");
const { chromeuxreport } = require("googleapis/build/src/apis/chromeuxreport");

module.exports = {
    getAllApiCategory: async (ctx) => {
        try {
          const char = ctx.params.char
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

          const filteredResult = result.filter(item => {
            return item.category_name.charAt(0).toLowerCase() === char.toLowerCase();
          });
    
          filteredResult.forEach(api_cat => {
            api_cat.api_collections.forEach(api_coll => {
              api_coll.count = api_coll.api_ids.length;
              delete api_coll.api_ids;
            })
          });

          const sortedResult = filteredResult.sort((a, b) => {
            const nameA = a.category_name.toLowerCase();
            const nameB = b.category_name.toLowerCase();
            return nameA.localeCompare(nameB);
        });
    
          return sortedResult;
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
        } catch (error) {
          await errorHandler(ctx, error)
        }
    },
    deleteApiCategory: async (ctx) => {
      try {
        const categoryID = ctx.params.id;
        const findOneResult = await strapi.entityService.findOne("api::api-category.api-category", categoryID,{
          fields: ['category_name'],
          populate: {
            api_collections: {
              fields: ['api_collection_name']
            }
          }
        });
        if(findOneResult.api_collections.length > 0){
          return ctx.send({message: "Please ensure no Api collection is in this category"});
        }
        const deleteEntry = await strapi.entityService.delete("api::api-category.api-category", categoryID)
        ctx.send({message: `Api Category ${findOneResult.category_name} is deleted`});
      } catch (error) {
        await errorHandler(ctx, error);
      }
    },
}