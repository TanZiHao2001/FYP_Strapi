const cookie = require("cookie");
const {getVendorIdFromToken, signToken} = require("../../jwt_helper");
const createError = require("http-errors");
const {errorHandler} = require("../../error_helper");
const {sanitize} = require("@strapi/utils");
const {contentAPI} = sanitize;
const bcrypt = require("bcryptjs");
const AuthController = require('./AuthController');

module.exports = {
  async updateProfile(ctx) {
    try {
      const parsedCookies = cookie.parse(ctx.request.header.cookie || "");
      const accessToken = parsedCookies?.accessToken;

      const vendorId = await getVendorIdFromToken('accessToken', accessToken);
      if (!vendorId) {
        throw createError.Unauthorized();
      }

      const {username} = ctx.request.body;

      await strapi.entityService.update('api::vendor.vendor', vendorId, {
        data: {
          username: username
        },
      });

      return {message: 'Successfully Updated'};
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  async changePassword(ctx) {
    try {
      const parsedCookies = cookie.parse(ctx.request.header.cookie || "");
      const accessToken = parsedCookies?.accessToken;

      const vendorId = await getVendorIdFromToken('accessToken', accessToken);
      if (!vendorId) {
        throw createError.Unauthorized();
      }

      const {password, newPassword} = ctx.request.body;

      if (!newPassword || newPassword.length <= 0) {
        throw new Error("Password cannot be empty!");
      }

      const entry = await strapi.entityService.findOne('api::vendor.vendor', vendorId);
      const isPasswordValid = await bcrypt.compare(password, entry.password);
      if (!isPasswordValid) {
        return ctx.send({error: "Invalid email / password"});
      }

      await strapi.entityService.update("api::vendor.vendor", vendorId, {
        data: {
          password: newPassword
        },
      });

      return ctx.send({message: "Successfully Changed"});
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  async getVendorList(ctx){
    try {
      ctx.request.query = {
        fields: ["username", "email", "status"],
      };
      const contentType = strapi.contentType("api::vendor.vendor");
      const sanitizedQueryParams = await contentAPI.query(
        ctx.request.query,
        contentType
      );
      const entities = await strapi.entityService.findMany(
        contentType.uid,
        sanitizedQueryParams
      );
      const vendorList = await contentAPI.output(entities, contentType);
      
      const statusOrder = {
        "Pending": 1,
        "Approved": 2,
        "Rejected": 3 
      };
      
      vendorList.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
      return vendorList;
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  async createUser (ctx){
    try {
      const {email, organisation} = ctx.request.body;

      if (!validateEmail(email)) {
        throw new Error("Please enter a valid email!");
      }
      const result = await strapi.db.query("api::vendor.vendor").findMany({
        where: {
          email: {
            $eq: email,
          },
        },
      });

      if (result.length !== 0) {
        return ctx.send({error: "Email already existed!"});
      }
      const entry = await strapi.entityService.create("api::vendor.vendor", {
        data: {
          email: email,
          username: email.split("@")[0],
          organisation: organisation,
          status: "Approved",
          publishedAt: Date.now(),
          emailSentDate: Date.now(),
        },
      });

      AuthController.sendEmail(ctx);

      ctx.send({message: "Vendor created, an email has been sent to the vendor"});
    } catch (error) {
      await errorHandler(ctx, error)
    }
  },
  async blockVendor (ctx) {
    try{
      const {id} = ctx.request.body;
      const update = await strapi.entityService.update('api::vendor.vendor', id, {
        data: {
          "status": "Rejected",
        }
      });
      ctx.send({message: "Vendor has been blocked"});
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  async unblockVendor (ctx) {
    try{
      const {id} = ctx.request.body;
      
      const update = await strapi.entityService.update('api::vendor.vendor', id, {
        data: {
          "status": "Approved",
        }
      });
      if(update.emailSentTime === null){
        ctx.request.body = { email: update.email };
        console.log(ctx.request.body)
        await AuthController.sendEmail(ctx);
        console.log('here')
      }
      console.log('skipped')
      ctx.send({message: "Vendor has been unblocked"});
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  async getTotalUser (ctx) {
    try {
      const days = ctx.params?.days;
      // get count of user list, if gt number of days, filter by current day - activated day < given day
      const result = await strapi.entityService.findMany("api::vendor.vendor", {
        filters: {
          lastLoginTime: {
            $null: false
          }
        }
      })

      if(!days || (days % 30 !== 0) || days > 90){
        return result.length;
      }

      const timeNow = Date.now();
      const filteredResult = result.filter((user) => {
        return new Date(user.lastLoginTime).getTime() >= (timeNow - days * 24 * 60 * 60 * 1000)
      })
      return filteredResult.length;
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  async getNewUser (ctx) {
    try {
      const result = await strapi.entityService.findMany("api::vendor.vendor", {
        filters: {
          activatedTime: {
            $null: false
          }
        }
      });
      const timeNow = Date.now();
      const filteredResult = result.filter((user) => {
        return new Date(user.activatedTime).getTime() >= (timeNow - 30 * 24 * 60 * 60 * 1000)
      })
      return filteredResult.length;
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  async getNonActiveUser (ctx) {
    try {
      const allResult = await strapi.entityService.findMany("api::vendor.vendor");
      const result = await strapi.entityService.findMany("api::vendor.vendor", {
        filters: {
          activatedTime: {
            $null: true
          }
        }
      })
      const percentage = (result.length / allResult.length) * 100;
      return percentage;
    } catch (error) {
      await errorHandler(ctx, error);
    }
  },
  async getOneUser (ctx) {
    try {
      const userID = ctx.params.id;
      const user = await strapi.entityService.findOne("api::vendor.vendor", userID, {
        fields: ['fullName', 'email', 'username', 'organisation', 'status', 'activatedTime', 'lastLoginTime'],
        populate: {
          projects: {
            fields: ['project_name'],
          },
          access_controls: {
            fields: ['status'],
            filters: {
              $status: {
                $eq: 'Approved'
              }
            }
          }
        }
      });

      user.projectLength = user.projects.length;
      delete user.projects;
      user.numberAccessControl = user.access_controls.length;
      delete user.access_controls;
      return user
    } catch (error) {
      await errorHandler(ctx, error)
    }
  },
  async getOneUserAccessControl (ctx) {
    try {
      const char = ctx.params.char;
      const {id} = ctx.request.body;
      const userInfo = await strapi.entityService.findOne("api::vendor.vendor", id, {
        fields: ["email"],
        populate: {
          access_controls: {
            fields: ["status"],
            filters: {
              status: {
                $eq: "Approved"
              }
            },
            publicationState: "live",
            populate: {
              api_collection_id: {
                fields: ["api_collection_name"],
              }
            }
          }
        }
      });

      let userCurrentAccess = [];
      userInfo.access_controls.forEach((access_control) => {
        userCurrentAccess.push(access_control.api_collection_id.id)
      })
      ctx.request.query = {
        fields: ['category_name', 'image_url'],
        publicationState: 'live',
        populate: {
          api_collections: {
            fields: ['api_collection_name', 'createdAt', 'short_description'],
            publicationState: 'live',
            populate: {
              api_ids: {
                fields: ['id'],
              }
            }
          }
        }
      }
      const contentType = strapi.contentType("api::api-category.api-category");

      const sanitizedQueryParams = await contentAPI.query(
        ctx.query,
        contentType
      );

      const entities = await strapi.entityService.findMany(
        contentType.uid,
        sanitizedQueryParams
      );

      const result = await contentAPI.output(entities, contentType);
      
      const filteredResult = result.filter(item => {
        return item.category_name.charAt(0).toLowerCase() === char.toLowerCase();
      });

      filteredResult.forEach(api_cat => {
        api_cat.api_collections.forEach(api_coll => {
          if(userCurrentAccess.includes(api_coll.id)){
            api_coll.isActive = true;
          } else {
            api_coll.isActive = false;
          }
          delete api_coll.api_ids;
        })
      });

      const sortedResult = filteredResult.sort((a, b) => {
        const nameA = a.category_name.toLowerCase();
        const nameB = b.category_name.toLowerCase();
        return nameA.localeCompare(nameB);
    });

      return sortedResult;
    } catch (error) {
      await errorHandler(ctx, error)
    }
  }
};


function validateEmail(email) {
  var re = /\S+@\S+\.\S+/;
  return re.test(email);
}