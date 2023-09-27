const cookie = require("cookie");
const {getVendorIdFromToken, signToken} = require("../../jwt_helper");
const createError = require("http-errors");
const {errorHandler} = require("../../error_helper");
const {sanitize} = require("@strapi/utils");
const {contentAPI} = sanitize;
const bcrypt = require("bcryptjs");
const project = require("./project");
const vendor = require("../../vendor/controllers/vendor");

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

      const token_entry = await strapi.entityService.create('api::token.token', {
        data: {
          publishedAt: Date.now(),
          project_id: project_entry.id
        }
      })

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
  },
  async getProjectAPICollection(ctx) {
    try {
      const parsedCookies = cookie.parse(ctx.request.header.cookie || "");
      const accessToken = parsedCookies?.accessToken;

      const vendorId = await getVendorIdFromToken('accessToken', accessToken);
      if (!vendorId) {
        throw createError.Unauthorized();
      }

      const projectId = ctx.params.id;

      const db_vendorId = await strapi.entityService.findMany('api::project.project', {
        filters: {
          id: projectId,
          vendor: {
            id: vendorId,
          },
        },
      });

      if (db_vendorId.length === 0) {
        throw createError.Forbidden();
      }

      const entry = await strapi.entityService.findOne('api::project.project', projectId, {
        fields: ["id"],
        populate: {
          project_apis: {
            fields: ["id"],
            populate: {
              api_collection_id: {
                fields: ["api_collection_name", "description"]
              }
            }
          }
        }
      });
      entry.project_apis.forEach((project_api) => {
        project_api.api_collection_name = project_api.api_collection_id.api_collection_name;
        project_api.description = project_api.api_collection_id.description;
        delete project_api.api_collection_id;
        delete project_api.project_id;
      })
      return entry.project_apis;
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  async deleteProject(ctx) {
    try{
      const parsedCookies = cookie.parse(ctx.request.header.cookie || "");
      const accessToken = parsedCookies?.accessToken;
      const projectId = ctx.params.projectId;
      const tokenId = await strapi.entityService.findMany('api::token.token', {
        filters: {
          project_id: {
            id: projectId
          }
        },
        fields: ["id"]
      });
      const projectApiId = await strapi.entityService.findMany('api::project-api.project-api', {
        filters: {
          project_id: {
            id: projectId
          }
        },
        fields: ["id"]
      });
      const delete_token = await strapi.entityService.delete('api::token.token', tokenId[0].id)
      const delete_projectAPI = await strapi.entityService.delete('api::project-api.project-api', projectApiId[0].id)
      const delete_project = await strapi.entityService.delete('api::project.project', projectId)
      ctx.send({ message: "delete successful" });
    } catch(error){
      await errorHandler(ctx, error)
    }
  }
};
