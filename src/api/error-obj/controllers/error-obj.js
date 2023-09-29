"use strict";

const { errorHandler } = require("../../error_helper");
const createError = require("http-errors");
const cookie = require("cookie");
const { getVendorIdFromToken } = require("../../jwt_helper");
/**
 * error-obj controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::error-obj.error-obj", ({ strapi }) => ({
    async find(ctx) {
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

        const maxDepth = 4; 
        const childAttr = "child_attr_ids"
        const childAttrfields = ["attr_name", "attr_type", "attr_description"];

        const error_obj = await strapi.entityService.findMany('api::error-obj.error-obj', {
          filters: {
            isParent: true
          },
          fields: ["attr_name", "attr_type", "attr_description"],
          populate: generatePopulate(maxDepth, childAttr, childAttrfields),
        })

        error_obj.forEach((item) => {
            removeEmptyChildArrays(item)
        })
        return error_obj
      } catch (error) {
        await errorHandler(ctx, error);
      }
    },
  })
);

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

  function removeEmptyChildArrays(obj) {
    if (Array.isArray(obj)) {
      // If obj is an array, iterate through its elements
      for (let i = obj.length - 1; i >= 0; i--) {
        removeEmptyChildArrays(obj[i]);
        if (
          (Array.isArray(obj[i].child_attr_ids) && obj[i].child_attr_ids.length === 0) ||
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
          (key === "enum_ids" && Array.isArray(obj[key]) && obj[key].length === 0)
        ) {
          delete obj[key]; // Remove empty child_attr_ids or parent_param_id property
        } else {
          removeEmptyChildArrays(obj[key]);
        }
      }
    }
  }