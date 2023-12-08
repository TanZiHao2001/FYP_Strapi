const cookie = require("cookie");
const {getVendorIdFromToken, signToken} = require("../../jwt_helper");
const createError = require("http-errors");
const {errorHandler} = require("../../error_helper");
const {sanitize} = require("@strapi/utils");
const {contentAPI} = sanitize;
const bcrypt = require("bcryptjs");
const AuthController = require('./AuthController')

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
  }
};


function validateEmail(email) {
  var re = /\S+@\S+\.\S+/;
  return re.test(email);
}