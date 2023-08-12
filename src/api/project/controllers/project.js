'use strict';

/**
 * project controller
 */

const {createCoreController} = require('@strapi/strapi').factories;
const jwt = require('jsonwebtoken');
const {sanitize} = require('@strapi/utils')
const {contentAPI} = sanitize;

module.exports = createCoreController('api::project.project', ({strapi}) => ({

  async find(ctx) {
    const decoded = jwt.decode(ctx.request.header.authorization)
    const vendor_id = decoded.id;


    ctx.request.query = {
      filters: {
        vendor_id: {
          id: {
            $eq: vendor_id
          },
        }
      },
      fields: ['id', 'project_name', 'description', 'createdAt'],
      populate: {
        tokens: {
          populate: ['tokens']
        }
      }
    }


    const contentType = strapi.contentType('api::project.project')
    const sanitizedQueryParams = await contentAPI.query(ctx.query, contentType)
    const entities = await strapi.entityService.findMany(contentType.uid, sanitizedQueryParams)

    const result = await contentAPI.output(entities, contentType);
    result[0].tokens.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    result[0].token = result[0].tokens[0].token;
    delete result[0].tokens;

    return result[0]
  }

}));
