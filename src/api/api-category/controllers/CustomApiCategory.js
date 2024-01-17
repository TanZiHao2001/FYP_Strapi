const { sanitize } = require("@strapi/utils");
const { contentAPI } = sanitize;
const cookie = require("cookie");
const { getVendorIdFromToken, checkAccessAdmin } = require("../../jwt_helper");
const createError = require("http-errors");
const { errorHandler } = require("../../error_helper");
const { chromeuxreport } = require("googleapis/build/src/apis/chromeuxreport");

module.exports = {
    getAllApiCategoryByChar: async (ctx) => {
        try {
          if (!(await checkAccessAdmin(ctx))) {
            throw createError.Unauthorized();
          }
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
    getAllApiCategory: async (ctx) => {
      try {
        if (!(await checkAccessAdmin(ctx))) {
          throw createError.Unauthorized();
        }
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

        const sortedResult = result.sort((a, b) => {
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
          if (!(await checkAccessAdmin(ctx))) {
            throw createError.Unauthorized();
          }
          const {category_name, image_url} = ctx.request.body;
          if(!isNameValid(category_name)) {
            return ctx.send({error: `${category_name} is not a valid name, please start with a letter`})
          }
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
        if (!(await checkAccessAdmin(ctx))) {
          throw createError.Unauthorized();
        }
        const categoryID = ctx.params.id;
        const findOneResult = await strapi.entityService.findOne("api::api-category.api-category", categoryID,{
          fields: ['category_name'],
          populate: {
            api_collections: {
              fields: ['api_collection_name'],
              populate: {
                access_controls: {
                  fields: ["status"],
                  filters: {
                    status: {
                      $eq: "Approved"
                    }
                  },
                  populate: {
                    vendor_id: {
                      fields: ["username"]
                    }
                  }
                }
              }
            }
          }
        });

        for(let i = 0; i < findOneResult.api_collections.length; i++){
          if(findOneResult.api_collections[i].access_controls.length > 0){
            let usernames = [];
            findOneResult.api_collections[i].access_controls.forEach(access_control => {
              usernames.push(access_control.vendor_id.username);
            })
            const errorMessage = `Vendor ${usernames.join(', ')} have access to Api Collection ${findOneResult.api_collections[i].api_collection_name}`;
            console.log(errorMessage)
            return ctx.send({message: errorMessage})
          }
        }
        const deleteEntry = await strapi.entityService.delete("api::api-category.api-category", categoryID)
        ctx.send({message: `Api Category ${findOneResult.category_name} is deleted`});
      } catch (error) {
        await errorHandler(ctx, error);
      }
    },
}

function isNameValid(name) {
  const startsWithLetter = /^[a-zA-Z]/.test(name);
  return startsWithLetter;
}