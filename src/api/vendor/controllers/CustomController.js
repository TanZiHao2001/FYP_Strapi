const cookie = require("cookie");
const {getVendorIdFromToken, signToken} = require("../../jwt_helper");
const createError = require("http-errors");
const {errorHandler} = require("../../error_helper");
const {sanitize} = require("@strapi/utils");
const {contentAPI} = sanitize;
const bcrypt = require("bcryptjs");

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
        "Activated": 2,
        "Email Sent": 3,
        "Approved": 4,
        "Rejected": 5 
      };
      
      vendorList.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
      return vendorList;
    } catch (error) {
      await errorHandler(ctx, error);
    }
  }
};