'use strict';


const {sanitize} = require('@strapi/utils')
const {contentAPI} = sanitize;
/**
 * access-control controller
 */
const {createCoreController} = require('@strapi/strapi').factories;
const jwt = require('jsonwebtoken');
module.exports = createCoreController('api::access-control.access-control', ({strapi}) => ({

  async find(ctx) {
    const decoded  =  jwt.decode(ctx.request.header.authorization)
    const vendor_id =  decoded.id;

    ctx.request.query.filters = {
      vendor_id: {
        id: {
          $eq: vendor_id
        },
      }
    }

    const contentType = strapi.contentType('api::access-control.access-control')
    const sanitizedQueryParams = await contentAPI.query(ctx.query, contentType)
    const entities = await strapi.entityService.findMany(contentType.uid, sanitizedQueryParams)
    return await contentAPI.output(entities, contentType);
  }
}));
