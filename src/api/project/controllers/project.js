'use strict';

/**
 * project controller
 */

const {createCoreController} = require('@strapi/strapi').factories;
const jwt = require('jsonwebtoken');
const {sanitize} = require('@strapi/utils')
const {contentAPI} = sanitize;
const cookie = require('cookie');
const createError = require("http-errors");

module.exports = createCoreController('api::project.project', ({strapi}) => ({

  async find(ctx) {

    let vendorId;
    const parsedCookies = cookie.parse(ctx.request.header.cookie);
    const accessToken = parsedCookies.accessToken;

    jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
      if (err) {
        if (err.name === 'JsonWebTokenError') {
          return next(createError.Unauthorized())
        } else {
          return next(createError.Unauthorized(err.message))
        }
      }
      vendorId = payload.aud;
    })

    ctx.request.query = {
      filters: {
        vendor_id: {
          id: {
            $eq: vendorId
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

    return result;
  }

}));
