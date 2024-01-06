"use strict";

/**
 * api-collection controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const {sanitize} = require('@strapi/utils')
const {getVendorIdFromToken, checkAccessAdmin, checkAccessVendor} = require("../../jwt_helper");
const {contentAPI} = sanitize;
const cookie = require("cookie");
const createError = require("http-errors");
const {errorHandler} = require('../../error_helper');

module.exports = createCoreController(
  "api::api-collection.api-collection",
  ({ strapi }) => ({
    async find(ctx) {
      try {
        const vendorId = await checkAccessVendor(ctx)
        if (!vendorId) {
          throw createError.Unauthorized();
        }
        ctx.request.query = {
          filters: {
            vendor_id: {
              id: {
                $eq: vendorId,
              },
            },
            status: {
                $eq: "Approved",
            }
          },
          fields: ["status"],
          publicationState: 'live',
          populate: {
            api_collection_id: {
              fields: ["api_collection_name", "description"],
              publicationState: 'live',
            },
          },
        };


        const contentType = strapi.contentType(
          "api::access-control.access-control"
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

        result.forEach((item) => {
          if(item.api_collection_id !== null){
            item.api_collection_name = item.api_collection_id.api_collection_name;
            item.api_collection_description = item.api_collection_id.description;
            item.api_collection_id = item.api_collection_id.id;
          }
        });

        return result;
      } catch (error) {
        await errorHandler(ctx, error);
      }
    },
    async findOne(ctx) {
      try {
        if (!(await checkAccessAdmin(ctx))) {
          throw createError.Unauthorized();
        }
        
        const id = ctx.params.id;
        const maxDepth = 4; 
        const childAttr = "child_attr_ids"
        const childAttrfields = ["attr_name", "attr_type", "attr_description"];
        const childParam = "child_attr_ids";
        const childParamFields = ["attr_name", "attr_type", "attr_description"];
        
        ctx.request.query = {
          filters: {
            api_collections: {
              id: {
                $eq: id
              }
            },
          },
          fields: ["category_name"],
          populate: {
            api_collections: {
              filters: {
                id: {
                  $eq: id
                }
              },
              fields: ["api_collection_name", "description", "short_description"],
              populate: {
                object_id: {
                  fields: ["object"],
                  populate: {
                    attr_ids: {
                      fields: ["attr_name", "attr_type", "attr_description"],
                      populate: generatePopulate(maxDepth, childAttr, childAttrfields),
                    },
                  },
                },
                api_ids: {
                  fields: ["api_name", "api_description", "api_return", "api_method", "api_endpoint", "api_response_json"],
                  populate: {
                    api_req_code_ids: {
                      fields: ["lang_name", "api_req_code"],
                    },
                    api_param_ids: {
                      fields: ["attr_name", "attr_type", "attr_description"],
                      populate: generatePopulate(maxDepth, childParam, childParamFields),
                    },
                  },
                },
              },
            },
          },
        };
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
        if (result.length === 0) {
          return ctx.send([]);
        }
        
        result.forEach((items) => {
          // items.api_collections.forEach((api_collection) => {
          //   api_collection.api_ids.forEach((api_id) => {
          //       api_id.api_req_code_ids.forEach((api_req_code_id) => {
          //         api_id.lang_name = api_req_code_id.lang_name;
          //         api_id.api_req_code = api_req_code_id.api_req_code;
          //       })
          //   })
          // })
          removeEmptyChildArrays(items)
        });
        return result[0];
      } catch (error) {
        await errorHandler(ctx, error);
      }
    }
  })
);

function removeEmptyChildArrays(obj) {
  if (Array.isArray(obj)) {
    // If obj is an array, iterate through its elements
    for (let i = obj.length - 1; i >= 0; i--) {
      removeEmptyChildArrays(obj[i]);
      if (
        (Array.isArray(obj[i].child_attr_ids) && obj[i].child_attr_ids.length === 0) ||
        (Array.isArray(obj[i].child_param_id) && obj[i].child_param_id.length === 0) ||
        (Array.isArray(obj[i].enum_ids) && obj[i].enum_ids.length === 0)
      ) {
        // Remove elements with empty child_attr_ids or parent_param_id arrays
        obj.splice(i, 1);
      }
    }
  } else if (typeof obj === "object") {
    // If obj is an object, recursively call the function for its properties
    for (const key in obj) {
      if (
        (key === "child_attr_ids" && Array.isArray(obj[key]) && obj[key].length === 0) ||
        (key === "child_param_id" && Array.isArray(obj[key]) && obj[key].length === 0) ||
        (key === "enum_ids" && Array.isArray(obj[key]) && obj[key].length === 0)
      ) {
        delete obj[key]; // Remove empty child_attr_ids or parent_param_id property
      } else {
        removeEmptyChildArrays(obj[key]);
      }
    }
  }
}

function generatePopulate(depth, foreignKey, fields) {
  if (depth <= 0) {
    return {};
  }

  const populateObject = {};
  populateObject[foreignKey] = {
    fields,
    populate: {
      enum_ids: {
        fields: ["enum_name", "enum_description"],
      },
      [foreignKey]: {
        fields,
      },
      populate: generatePopulate(depth - 1, foreignKey, fields)
    }
  };
  return populateObject;
}