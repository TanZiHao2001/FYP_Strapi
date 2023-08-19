'use strict';

/**
 * access-control controller
 */
const {createCoreController} = require('@strapi/strapi').factories;
const {sanitize} = require('@strapi/utils')
const {getVendorIdFromToken} = require("../../jwt_helper");
const {contentAPI} = sanitize;
const cookie = require("cookie");

module.exports = createCoreController('api::access-control.access-control', ({strapi}) => ({

  async find(ctx) {
    let vendorId;
    const parsedCookies = cookie.parse(ctx.request.header.cookie);
    const accessToken = parsedCookies.accessToken;

    vendorId = await getVendorIdFromToken('accessToken', accessToken);
    if(!vendorId) {
      throw new Error ('Unauthorised!');
    }

    ctx.request.query = {
      filters: {
        vendor_id: {
          id: {
            $eq: vendorId,
          },
        }
      },
      fields: ['status'],
      populate: {
        api_collection_id: {
          fields: ['api_collection_name']
        },
      }
    }

    const contentType = strapi.contentType('api::access-control.access-control')
    const sanitizedQueryParams = await contentAPI.query(ctx.query, contentType)
    const entities = await strapi.entityService.findMany(contentType.uid, sanitizedQueryParams)
    const result = await contentAPI.output(entities, contentType);


    result.forEach(item => {
      item.api_collection_name = item.api_collection_id.api_collection_name;
      item.api_collection_id = item.api_collection_id.id;
    });

    return result;

  }
}));
