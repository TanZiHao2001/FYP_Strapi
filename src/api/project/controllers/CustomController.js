const cookie = require("cookie");
const {getVendorIdFromToken, signToken} = require("../../jwt_helper");
const createError = require("http-errors");
const {errorHandler} = require("../../error_helper");
const {sanitize} = require("@strapi/utils");
const {contentAPI} = sanitize;
const bcrypt = require("bcryptjs");

module.exports = {
  async createProject(ctx) {
    try {
      const parsedCookies = cookie.parse(ctx.request.header.cookie || "");
      const accessToken = parsedCookies?.accessToken;

      const vendorId = await getVendorIdFromToken('accessToken', accessToken);
      if (!vendorId) {
        throw createError.Unauthorized();
      }

      const {project_name, description, apiCollection} = ctx.request.body;

      const entries = await strapi.entityService.findMany('api::access-control.access-control', {
        filters: {
          status: 'Approved',
          vendor_id: {
            id: vendorId
          },
          api_collection_id: {
            id: apiCollection
          }
        },
        populate: {
          api_collection_id: {
            fields: ["api_collection_name"]
          }
        }
      });
      const entityIDs = entries.map(entity => entity.api_collection_id.id);
      const allIDsExist = apiCollection.every(id => entityIDs.includes(id));

      if (!allIDsExist) {
        return ctx.send({error: "Not have access on certain API"});
      }

      const project_entry = await strapi.entityService.create('api::project.project', {
        data: {
          project_name: project_name,
          description: description,
          status: 'Approved',
          publishedAt: Date.now(),
          vendor: {
            id: vendorId
          }
        },
      });

      for (const apiId of apiCollection) {
        await strapi.entityService.create('api::project-api.project-api', {
          data: {
            project_id: project_entry,
            api_collection_id: {id: apiId},
            publishedAt: Date.now(),
          },
        });
      }

      return ctx.send({message: "Successfully Created"});
    } catch (error) {
      await errorHandler(ctx, error);
    }
  }
};
