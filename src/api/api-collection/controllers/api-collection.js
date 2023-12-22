"use strict";

/**
 * api-collection controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const {sanitize} = require('@strapi/utils')
const {getVendorIdFromToken} = require("../../jwt_helper");
const {contentAPI} = sanitize;
const cookie = require("cookie");
const createError = require("http-errors");
const {errorHandler} = require('../../error_helper');

module.exports = createCoreController(
  "api::api-collection.api-collection",
  ({ strapi }) => ({
    async find(ctx) {
      try {
        const parsedCookies = cookie.parse(ctx.request.header.cookie || "");
        const accessToken = parsedCookies?.accessToken;

        const vendorId = await getVendorIdFromToken("accessToken", accessToken);
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
        // const parsedCookies = cookie.parse(ctx.request.header.cookie || "");
        // const accessToken = parsedCookies?.accessToken;
        const id = 207;

        // const vendorId = await getVendorIdFromToken("accessToken", accessToken);
        // if (!vendorId) {
        //   throw createError.Unauthorized();
        // }

        const result = await strapi.entityService.findOne("api::api-collection.api-collection", id, {
        });

        return result;
      } catch (error) {

      }
    }
  })
);
