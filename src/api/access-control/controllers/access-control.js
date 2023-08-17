'use strict';

/**
 * access-control controller
 */
const {createCoreController} = require('@strapi/strapi').factories;
const jwt = require('jsonwebtoken');
const {sanitize} = require('@strapi/utils')
const {removeUserRelationFromRoleEntities} = require("@strapi/plugin-users-permissions/server/utils/sanitize/visitors");
const {contentAPI} = sanitize;

module.exports = createCoreController('api::access-control.access-control', ({strapi}) => ({

  async find(ctx) {
    // const decoded = jwt.decode(ctx.request.header.authorization)
    // const vendor_id = decoded.id;

    ctx.request.query = {
      filters: {
        vendor_id: {
          id: {
            $eq: 1
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
    console.log(ctx)
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
