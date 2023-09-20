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
      // const populateStructure = generatePopulate(maxDepth);
      // const populateStructure = generatePopulate(maxDepth, childAttr, childAttrfields);
      const maxDepth = 4; 
      const childAttr = "child_attr_ids"
      const childAttrfields = ["attr_name", "attr_type", "attr_description"];
      const childParam = "parent_param_id";
      const childParamFields = ["param_name", "param_type", "param_description"];
      
      ctx.request.query = {
        filters: {
          api_collections: {
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
        },
        fields: ["category_name"],
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
                fields: [
                  "api_name",
                  "api_description",
                  "api_return",
                  "api_method",
                  "api_endpoint",
                  "api_response_json",
                ],
                populate: {
                  api_req_code_ids: {
                    fields: ["api_req_code"],
                  },
                  api_param_ids: {
                    fields: ["param_name", "param_type", "param_description"],
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
      console.log(vendorId);
      if (result.length === 0) {
        return ctx.send([]);
      }
      //   result[0].api_collections[0].api_ids[0].id = result[0].api_collections[0].api_ids[0].api_req_code_ids[0].id;
      //   result[0].api_collections[0].api_ids[0].api_req_code = result[0].api_collections[0].api_ids[0].api_req_code_ids[0].api_req_code;

      result.forEach((item) => {
        item.api_collections[0].api_ids[0].api_req_code =
          item.api_collections[0].api_ids[0].api_req_code_ids[0].api_req_code;
        delete item.api_collections[0].api_ids[0].api_req_code_ids;
        var temp = item.api_collections[0].object_id.attr_ids;
        removeEmptyChildAttrIds(temp);
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
            fields: ["api_collection_name", "description"]
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
  getParamEnum: async (ctx) => {
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
        fields: ["api_collection_name"],
        populate: {
          api_ids: {
            populate: {
              api_param_ids: {
                fields: ["param_name", "param_type", "param_description"],
              },
            },
          },
        },
      };

      const contentType = strapi.contentType(
        "api::api-collection.api-collection"
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
      await errorHandler(ctx, error);
    }
  },
};

function removeEmptyChildAttrIds(obj) {
  if (Array.isArray(obj)) {
    // If obj is an array, iterate through its elements
    for (let i = obj.length - 1; i >= 0; i--) {
      removeEmptyChildAttrIds(obj[i]);
      if (
        Array.isArray(obj[i].child_attr_ids) &&
        obj[i].child_attr_ids.length === 0
      ) {
        // Remove elements with empty child_attr_ids arrays
        obj.splice(i, 1);
      }
    }
  } else if (typeof obj === "object") {
    // If obj is an object, recursively call the function for its properties
    for (const key in obj) {
      if (
        key === "child_attr_ids" &&
        Array.isArray(obj[key]) &&
        obj[key].length === 0
      ) {
        delete obj[key]; // Remove empty child_attr_ids property
      } else {
        removeEmptyChildAttrIds(obj[key]);
      }
    }
  }
}

// function generatePopulate(depth) {
//   if (depth <= 0) {
//     return {};
//   }
  
//   return {
//     child_attr_ids: {
//       fields: ["attr_name", "attr_type", "attr_description"],
//       populate: generatePopulate(depth - 1)
//     }
//   };
// }

function generatePopulate(depth, foreignKey, fields) {
  if (depth <= 0) {
    return {};
  }

  const populateObject = {};
  populateObject[foreignKey] = {
    fields,
    populate: generatePopulate(depth - 1, foreignKey, fields)
  };

  return populateObject;
}