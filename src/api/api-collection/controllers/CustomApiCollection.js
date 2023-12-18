const { sanitize } = require("@strapi/utils");
const { contentAPI } = sanitize;
const cookie = require("cookie");
const { getVendorIdFromToken } = require("../../jwt_helper");
const createError = require("http-errors");
const { errorHandler } = require("../../error_helper");

module.exports = {
  apiCollection: async (ctx) => {
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

      const lang_name = ctx.params.lang;
      const maxDepth = 4; 
      const childAttr = "child_attr_ids"
      const childAttrfields = ["attr_name", "attr_type", "attr_description"];
      const childParam = "child_attr_ids";
      const childParamFields = ["attr_name", "attr_type", "attr_description"];
      
      ctx.request.query = {
        filters: {
          api_collections: {
            access_controls: {
              vendor_id: {
                id: {
                  $eq: vendorId,
                },
                // status: {
                //   $eq: "Approved",
                // }
              },
              status: {
                $eq: "Approved",
              },
              publishedAt: {
                $null: false,
              },
            },
          },
        },
        fields: ["category_name"],
        publicationState: 'live',
        populate: {
          api_collections: {
            filters: {
              access_controls: {
                vendor_id: {
                  id: {
                    $eq: vendorId,
                  },
                },
                status: {
                  $eq: "Approved",
                },
                publishedAt: {
                  $null: false,
                },
              },
            },
            fields: ["api_collection_name", "description"],
            publicationState: 'live',
            populate: {
              object_id: {
                fields: ["object"],
                publicationState: 'live',
                populate: {
                  attr_ids: {
                    fields: ["attr_name", "attr_type", "attr_description"],
                    publicationState: 'live',
                    populate: generatePopulate(maxDepth, childAttr, childAttrfields),
                  },
                },
              },
              api_ids: {
                fields: ["api_name", "api_description", "api_return", "api_method", "api_endpoint", "api_response_json"],
                publicationState: 'live',
                populate: {
                  api_req_code_ids: {
                    filters: {
                      lang_name: lang_name,
                    },
                    fields: ["lang_name", "api_req_code"],
                    publicationState: 'live',
                  },
                  api_param_ids: {
                    fields: ["attr_name", "attr_type", "attr_description"],
                    publicationState: 'live',
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
        items.api_collections.forEach((api_collection) => {
          api_collection.api_ids.forEach((api_id) => {
              api_id.api_req_code_ids.forEach((api_req_code_id) => {
                api_id.lang_name = api_req_code_id.lang_name;
                api_id.api_req_code = api_req_code_id.api_req_code;
              })
          })
        })
        removeEmptyChildArrays(items)
      });
      return result;
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  subscribedApiCollection: async (ctx) => {
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
        filters: {
          api_collections: {
            access_controls: {
              vendor_id: {
                id: vendorId,
              },
              status: {
                $eq: "Approved",
              },
            },
          },
        },
        fields: ["category_name"],
        publicationState: 'live',
        populate: {
          api_collections: {
            filters: {
              access_controls: {
                vendor_id: {
                  id: {
                    $eq: vendorId,
                  },
                },
                status: {
                  $eq: "Approved",
                },
              },
            },
            fields: ["api_collection_name", "description"],
            publicationState: 'live',
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

      return result;
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  getAllApiCollection: async (ctx) => {
    try {

      ctx.request.query = {
        fields: ['api_collection_name', 'createdAt'],
        publicationState: 'live',
        populate: {
          api_category_id: {
            fields: ['category_name'],
            publicationState: 'live',
          },
          api_ids: {
            fields:['id'],
          }
        },
      }
      const contentType = strapi.contentType("api::api-collection.api-collection");

      const sanitizedQueryParams = await contentAPI.query(
        ctx.query,
        contentType
      );

      const entities = await strapi.entityService.findMany(
        contentType.uid,
        sanitizedQueryParams
      );

      const result = await contentAPI.output(entities, contentType);

      result.forEach(item => {
        item.count = item.api_ids.length
        item.api_category_name = item.api_category_id.category_name;
        delete item.api_category_id;
        delete item.api_ids;
      });

      return result;
    } catch (error) {
      await errorHandler(ctx, error)
    }
  },
  createApiCollection: async (ctx) => {
    try {
      const {api_collection_name, description, short_description, api_category_id} = ctx.request.body;
      const entry = await strapi.entityService.create("api::api-collection.api-collection", {
        data: {
          api_collection_name: api_collection_name,
          description: description,
          short_description: short_description,
          api_category_id: api_category_id,
          publishedAt: Date.now()
        }
      })
      ctx.send({message: `Api Collection ${entry.api_collection_name} created`})
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  deleteApiCollection: async (ctx) => {
    try {
      const collectionID = ctx.params.id;
      const findOneResult = await strapi.entityService.findOne("api::api-collection.api-collection", collectionID,{
        fields: ['api_collection_name'],
        populate: {
          access_controls: {
            fields: ["status"],
            filters: {
              status: {
                $eq: "Approved",
              }
            },
            populate: {
              vendor_id: {
                fields: ["username"]
              }
            }
          },
        }
      });
      // if(findOneResult.access_controls.length === 0){
      //   return ctx.send({message: "Please ensure no Api is in this category"});
      // }
      for(let i = 0; i < findOneResult.access_controls.length; i++){
        let usernames = [];
        findOneResult.access_controls.forEach(access_control => {
          usernames.push(access_control.vendor_id.username);
        })
        const errorMessage = `Vendor ${usernames.join(', ')} have access to Api Collection ${findOneResult.api_collection_name}`;
        console.log(errorMessage)
        return ctx.send({message: errorMessage})
      }
      const deleteEntry = await strapi.entityService.delete("api::api-collection.api-collection", collectionID)
      ctx.send({message: `Api Collection ${findOneResult.api_collection_name} is deleted`});
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  createWholeApiCollectionFromFile: async (ctx) => {
    try {
      const {category_name, api_collection} = ctx.request.body;
      const apiCategory = await strapi.entityService.findMany("api::api-category.api-category", {
        filters: {
          category_name: {
            $eq: category_name
          }
        }
      });
      console.log(apiCategory[0].id)
      /*
      ALL OF THE NAMES ARE BASED ON JSON INPUT, NOT NAMED DEFINED IN STRAPI, HENCE WILL HAVE DIFFERENT NAME
      FIRST LEVEL: api_collection (1 only)
        ATTRIBUTES: 
        1. api_collection_name
        2. api_collection_description
        3. api_category_id (this is apiCategory[0].id)

      SECOND LEVEL PART 1: object (1 only)
        ATTRIBUTES:
        1. object_json
        2. api_collection_id (this can be obtained after creating api_collection)

        THIRD LEVEL FOR SECOND PART 1: attributes (an array of attributes)
        ATTRIBUTES:
        1. attribute_name
        2. attribute_type,
        3. attribute_description
        *4. object_id (this can be obtained after creating object) (NOTE: this is only needed for the first level, for its child does not need this attribute)
        ***
        5. enums? (check if enums is available, if yes will have a sub level of this attribute object)
        6. child_attributes? (check if child_attributes is available, if yes will have a sub level of this attribute object)
        ***

      SECOND LEVEL PART 2: apis (an array of apis)
        ATTRIBUTES:
        1. api_name
        2. api_description
        3. api_return
        4. api method
        5. api_endpoint
        6. api_response_json
        7. api_collection_id (this can be obtained after creating api_collection)

        THIRD LEVEL FOR SECOND PART 2 (PART 1): api_parameters (an array of api_parameters)
        ATTRIBUTES:
        1. attribute_name
        2. attribute_type,
        3. attribute_description
        *4. api_id (this can be obtained after creating api) (NOTE: this is only needed for the first level, for its child does not need this attribute)
        ***
        5. enums? (check if enums is available, if yes will have a sub level of this attribute object)
        6. child_attributes? (check if child_attributes is available, if yes will have a sub level of this attribute object)
        ***
      
        THIRD LEVEL FOR SECOND PART 2 (PART 2): api_request_codes (an array of api_request_codes)
        ATTRIBUTES:
        1. language_name (java, python, go, http, javascript, php, ruby)
        2. api_request_code
      */
      return api_collection;
    } catch (error) {
      await errorHandler(ctx, error)
    }
  }
};


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
        publicationState: 'live',
      },
      [foreignKey]: {
        fields,
      },
      populate: generatePopulate(depth - 1, foreignKey, fields)
    }
  };
  return populateObject;
}

