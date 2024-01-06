"use strict";

/**
 * project controller
 */

const {createCoreController} = require("@strapi/strapi").factories;
const {sanitize} = require("@strapi/utils");
const {contentAPI} = sanitize;
const cookie = require("cookie");
const {getVendorIdFromToken, checkAccessVendor} = require("../../jwt_helper");
const createError = require("http-errors");
const {errorHandler} = require("../../error_helper");

module.exports = createCoreController("api::project.project", ({strapi}) => ({
  async find(ctx) {
    try {
      const vendorId = await checkAccessVendor(ctx)
      if (!vendorId) {
        throw createError.Unauthorized();
      }

      ctx.request.query = {
        filters: {
          vendor: {
            id: vendorId,
          },
        },
        fields: ["id", "project_name", "description", "createdAt"],
        populate: {
          tokens: {
            fields: ["created_date", "token"],
          },
        },
      };

      const contentType = strapi.contentType("api::project.project");
      const sanitizedQueryParams = await contentAPI.query(
        ctx.query,
        contentType
      );
      const entities = await strapi.entityService.findMany(
        contentType.uid,
        sanitizedQueryParams
      );
      const result = await contentAPI.output(entities, contentType);
      
      if(result.length > 0){
        result.forEach((item) => {
          if (item.tokens.length > 1) {
            item.tokens.sort(
              (a, b) => new Date(b.created_date) - new Date(a.created_date)
            );
          }
          item.token = item.tokens[0].token;
          delete item.tokens;
        })
      }
      else{
        throw createError.NotFound();
      }
      return result;
    } catch (error) {
      await errorHandler(ctx, error)
    }
  },
  async findOne(ctx){
    try{
      const vendorId = await checkAccessVendor(ctx)
      if (!vendorId) {
        throw createError.Unauthorized();
      }

      const projectId = ctx.params.id;

      const result = await strapi.entityService.findMany('api::project.project', {
        filters: {
          id: projectId,
          vendor: {
            id: vendorId,
          },
        },
      });

      if (result.length === 0) {
        throw createError.Forbidden();
      }

      return result;
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
}));
