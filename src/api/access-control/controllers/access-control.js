'use strict';

/**
 * access-control controller
 */
const {createCoreController} = require('@strapi/strapi').factories;
const {sanitize} = require('@strapi/utils')
const {getVendorIdFromToken, checkAccessVendor} = require("../../jwt_helper");
const {contentAPI} = sanitize;
const cookie = require("cookie");
const createError = require("http-errors");
const {errorHandler} = require('../../error_helper');

module.exports = createCoreController('api::access-control.access-control', ({strapi}) => ({

  async find(ctx) {
    try {
      const vendorId = await checkAccessVendor(ctx)
      if (!vendorId) {
        throw createError.Unauthorized();
      }
      
      ctx.request.query = {
        filters: {
          status: "Approved",
          vendor_id: {
            id: {
              $eq: vendorId,
            },
          },
        },
        fields: ['status'],
        publicationState: 'live',
        populate: {
          api_collection_id: {
            fields: ['api_collection_name'],
            publicationState: 'live',
          },
        }
      }

      const contentType = strapi.contentType('api::access-control.access-control')
      const sanitizedQueryParams = await contentAPI.query(ctx.query, contentType)
      const entities = await strapi.entityService.findMany(contentType.uid, sanitizedQueryParams)
      const result = await contentAPI.output(entities, contentType);

      result.forEach(item => {
        if(item.api_collection_id !== null){
          item.api_collection_name = item.api_collection_id.api_collection_name;
          item.api_collection_id = item.api_collection_id.id;
        }
      });

      return result;
    } catch (error) {
      await errorHandler(ctx, error);
    }
  }
}));
