const cookie = require("cookie");
const {getVendorIdFromToken, signToken, checkAccessVendor, checkAccessAdmin} = require("../../jwt_helper");
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
      const vendorId = await checkAccessVendor(ctx)
      if (!vendorId) {
        throw createError.Unauthorized();
      }

      const {project_name, description, apiCollection} = ctx.request.body;

      const entries = await strapi.entityService.findMany('api::access-control.access-control', {
        filters: {
          publicationState: 'live',
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
            fields: ["api_collection_name"],
            publicationState: 'live',
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

      const oneDayInMS = 24 * 60 * 60 * 1000;

      // const createdDateFormatted = getTimeNowInMiliInMalaysiaTime().getTime();
      // const expiredDateFormatted = getTimeNowInMiliInMalaysiaTime().getTime() + oneDayInMS;
      const dummy_token = await signToken('refreshToken', project_entry.id)
      const token_entry = await strapi.entityService.create('api::token.token', {
        data: {
          project_id: project_entry.id,
          created_date: Date.now(),
          expiration_date: Date.now() + oneDayInMS,
          token: dummy_token,
          publishedAt: Date.now(),
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
      const vendorId = await checkAccessVendor(ctx)
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
        publicationState: 'live',
        populate: {
          project_apis: {
            fields: ["id"],
            publicationState: 'live',
            populate: {
              api_collection_id: {
                fields: ["api_collection_name", "description"],
                publicationState: 'live',
              }
            }
          }
        }
      });
      entry.project_apis.forEach((project_api) => {
        if(project_api.api_collection_id !== null){
          project_api.api_collection_name = project_api.api_collection_id.api_collection_name;
          project_api.description = project_api.api_collection_id.description;
          delete project_api.api_collection_id;
          delete project_api.project_id;
        }
      })
      return entry.project_apis;
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  async deleteProject(ctx) {
    try{
      const vendorId = await checkAccessVendor(ctx)
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
      ctx.send({ message: "Delete successful" });
    } catch(error){
      await errorHandler(ctx, error)
    }
  },
  async getProjectDetails(ctx){
    try{
      const vendorId = await checkAccessVendor(ctx)
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

      const project_detail = await strapi.entityService.findOne('api::project.project', projectId, {
        fields: ["project_name", "description"]
      })
      return project_detail;
    } catch (error){
      await errorHandler(ctx, error)
    }
  },
  async updateProject(ctx){
    try{
      const vendorId = await checkAccessVendor(ctx)
      if (!vendorId) {
        throw createError.Unauthorized();
      }
      
      const {project_name, description} = ctx.request.body
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

      // if(!project_name && !description){
      //   throw createError.UnprocessableEntity("Please ensure at least one field is filled!");
      // }

      const projectDetails = await strapi.entityService.findOne('api::project.project', projectId, {
        fields: ["project_name", "description"]
      })

      const update_project = await strapi.entityService.update('api::project.project', projectId, {
        data:{
          project_name: project_name ? project_name : projectDetails.project_name,
          description: description ? description : projectDetails.description
        }
      })

      ctx.send({message: "Update successful!"});
    } catch (error){
      await errorHandler(ctx, error)
    }
  },
  async requestProjectToken(ctx) {
    try {
      const vendorId = await checkAccessVendor(ctx)
      if (!vendorId) {
        throw createError.Unauthorized();
      }

      const {project_id} = ctx.request.body;

      const db_vendorId = await strapi.entityService.findMany('api::project.project', {
        filters: {
          status: "Approved",
          id: project_id,
          vendor: {
            id: vendorId,
          },
        },
        populate: {
          tokens: {
            fields: ["expiration_date"]
          }
        }
      });

      if (db_vendorId.length === 0) {
        throw createError.Forbidden();
      }

      if (db_vendorId[0].tokens.length > 0) {
        for (const token of db_vendorId[0].tokens) {
          if(Date.now() < new Date(token.expiration_date).getTime()) {
            return ctx.send({"error": "A token is currently active for this project. Check with admin if you did not request it"})
          }
        }
      }

      const oneDayInMS = 24 * 60 * 60 * 1000
      const project_token = await signToken('verifyToken', project_id); //temporary
      const request_token = await strapi.entityService.create("api::token.token", {
        data: {
          project_id: project_id,
          created_date: Date.now(),
          expiration_date: Date.now() + oneDayInMS,
          token: project_token,  
          publishedAt: Date.now()
        }
      })
      ctx.send({"message": project_token})
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  async getAllProjectTokens(ctx){
    try{
      const vendorId = await checkAccessVendor(ctx)
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

      const token_history = await strapi.entityService.findOne('api::project.project', projectId, {
        fields:["id"],
        populate:{
          tokens:{
            fields:["token", "created_date", "expiration_date", "last_used_date"],
          }
        }
      })

      if (token_history.tokens.length > 1) {
        token_history.tokens.sort(
          (a, b) => new Date(b.created_date) - new Date(a.created_date)
        );
      }
      token_history.tokens.forEach((item) => {
        delete item.project_id;
      })

      return token_history.tokens;
    } catch(error){
      await errorHandler(ctx, error)
    }
  },
  async getUserProjectTable(ctx) {
    try {
      if (!(await checkAccessAdmin(ctx))) {
        throw createError.Unauthorized();
      }
      const vendorId = ctx.params.id;
      const result = await strapi.entityService.findMany("api::project.project", {
        fields: ["project_name", "description", "status", "createdAt"],
        filters: {
          vendor: {
            id: {
              $eq: vendorId
            }
          }
        }
      });
      return result;
    } catch (error) {
      await errorHandler(ctx, error)
    }
  },
  async blockUserProjectTable(ctx) {
    try {
      if (!(await checkAccessAdmin(ctx))) {
        throw createError.Unauthorized();
      }
      const {project_id} = ctx.request.body;
      const project_data = await strapi.entityService.findOne("api::project.project", project_id, {
        fields: ["project_name"]
      })

      if(Object.keys(project_data).length === 0) {
        ctx.send({error: "No project found"});
      }

      const result = await strapi.entityService.update("api::project.project", project_id, {
        data: {
          status: "Rejected"
        }
      });
      ctx.send({message: `Project ${project_data.project_name} has been blocked, vendor cannot request token`});
    } catch (error) {
      await errorHandler(ctx, error)
    }
  },
  async unblockUserProjectTable(ctx) {
    try {
      if (!(await checkAccessAdmin(ctx))) {
        throw createError.Unauthorized();
      }
      const {project_id} = ctx.request.body;
      const project_data = await strapi.entityService.findOne("api::project.project", project_id, {
        fields: ["project_name"]
      })

      if(Object.keys(project_data).length === 0) {
        ctx.send({error: "No project found"});
      }

      const result = await strapi.entityService.update("api::project.project", project_id, {
        data: {
          status: "Approved"
        }
      });
      ctx.send({message: `Project ${project_data.project_name} has been unblocked`});
    } catch (error) {
      await errorHandler(ctx, error)
    }
  },
};

function getTimeNowInMiliInMalaysiaTime() {
  const malaysiaTimeZoneOffset = 8; // Malaysia time is UTC+8
  const currentDate = new Date();
  const currentTimeInMili = new Date(currentDate.getTime() + malaysiaTimeZoneOffset * 60 * 60 * 1000);
  return currentTimeInMili;
  // const malaysiaTimeZoneOffset = 8; // Malaysia time is UTC+8
  // const currentDate = new Date();
  // const createdDate = new Date(currentDate.getTime() + malaysiaTimeZoneOffset * 60 * 60 * 1000);
  // const oneDayInMS = 24 * 60 * 60 * 1000;
  // const expiredDate = new Date(currentDate.getTime() + malaysiaTimeZoneOffset * 60 * 60 * 1000 + oneDayInMS);
  // const createdDateFormatted = createdDate.toISOString();
  // const expiredDateFormatted = expiredDate.toISOString();
}
