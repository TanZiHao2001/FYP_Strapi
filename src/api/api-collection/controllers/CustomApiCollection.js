const {sanitize} = require("@strapi/utils");
const {contentAPI} = sanitize;
const cookie = require("cookie");
const {getVendorIdFromToken} = require("../../jwt_helper");

module.exports = {
  apiCollection: async (ctx) => {
    try {
      if (!ctx.request.header.cookie) {
        return ctx.send({message: "Token not found!"})
      }
      const parsedCookies = cookie.parse(ctx.request.header.cookie);
      const accessToken = parsedCookies.accessToken;
      if (!accessToken) {
        return ctx.send({message: "Token not found!"})
      }

      const vendorId = await getVendorIdFromToken("accessToken", accessToken);
      if (!vendorId) {
        return ctx.send({message: "No such user!"})
      }

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
            fields: ["api_collection_name", "description"],
            populate: {
              object_id: {
                fields: ["object"],
                populate: {
                  attr_ids: {
                    fields: ["attr_name", "attr_type", "attr_description"],
                    populate: {
                      child_attr_ids: {
                        fields: ["attr_name", "attr_type", "attr_description"],
                        populate: {
                          child_attr_ids: {
                            fields: ["attr_name", "attr_type", "attr_description",],
                          },
                        },
                      },
                    },
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
      console.log(vendorId)
      if (result.length === 0) {
        return ctx.send([])
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
      ctx.send(error.message);
    }
  },
};

function removeEmptyChildAttrIds(obj) {
  if (Array.isArray(obj)) {
    // If obj is an array, iterate through its elements
    for (let i = obj.length - 1; i >= 0; i--) {
      removeEmptyChildAttrIds(obj[i]);
      if (Array.isArray(obj[i].child_attr_ids) && obj[i].child_attr_ids.length === 0) {
        // Remove elements with empty child_attr_ids arrays
        obj.splice(i, 1);
      }
    }
  } else if (typeof obj === "object") {
    // If obj is an object, recursively call the function for its properties
    for (const key in obj) {
      if (key === "child_attr_ids" && Array.isArray(obj[key]) && obj[key].length === 0) {
        delete obj[key]; // Remove empty child_attr_ids property
      } else {
        removeEmptyChildAttrIds(obj[key]);
      }
    }
  }
}
