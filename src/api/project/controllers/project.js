"use strict";

/**
 * project controller
 */

const {createCoreController} = require("@strapi/strapi").factories;
const {sanitize} = require("@strapi/utils");
const {contentAPI} = sanitize;
const cookie = require("cookie");
const {getVendorIdFromToken} = require("../../jwt_helper");

module.exports = createCoreController("api::project.project", ({strapi}) => ({
  async find(ctx) {
    try {
      let vendorId;
      const parsedCookies = cookie.parse(ctx.request.header.cookie);
      const accessToken = parsedCookies.accessToken;

      vendorId = await getVendorIdFromToken('accessToken', accessToken);
      if(!vendorId) {
        throw new Error ('Unauthorised!');
      }
      // ctx.request.query = {
      //   filters: {
      //     vendor_id: {
      //       id: {
      //         $eq: vendorId,
      //       },
      //     },
      //   },
      //   fields: ["id", "project_name", "description", "createdAt"],
      //   populate: {
      //     tokens: {
      //       populate: ["tokens"],
      //     },
      //   },
      // };

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
        // result[0].tokens.sort(
        //   (a, b) => new Date(b.created_date) - new Date(a.created_date)
        // );
        // result[0].token = result[0].tokens[0].token;
        // delete result[0].tokens;
      }
      // if no projects are returned
      else{
        throw new Error("No projects!");
      }
      return result;
    } catch (error) {
      if (error) {
        // If it's a validation error
        ctx.response.status = 200; //initially 204
        ctx.response.body = {error: error.message};
      } else {
        // Handle other errors accordingly
        ctx.response.status = 200; //500
        ctx.response.body = {error: "Internal Server Error"};
      }
    }
  },
  
  //TODO: customise findOne method so that vendor cannot get other vendor's project
}));
