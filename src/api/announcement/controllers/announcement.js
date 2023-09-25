"use strict";

/**
 * notification controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const { sanitize } = require("@strapi/utils");
const { contentAPI } = sanitize;
const createError = require("http-errors");
const { errorHandler } = require("../../error_helper");
const { forEach } = require("../../../../config/middlewares");

module.exports = createCoreController(
  "api::announcement.announcement",
  ({ strapi }) => ({
    async find(ctx) {
      try {
        ctx.request.query = {
          filters: {
            isActive: {
              $eq: true,
            },
          },
          fields: ["announcement_text", "createdAt"]
        };

        const contentType = strapi.contentType(
          "api::announcement.announcement"
        );

        const sanitizedQueryParams = await contentAPI.query(
          ctx.query,
          contentType
        );
        const entities = await strapi.entityService.findMany(
          contentType.uid,
          sanitizedQueryParams
        );
        const result = await contentAPI.output(entities, contentType);

        if (result.length > 0) {
          result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          result.forEach((item) => {
            delete item.id
            delete item.createdAt
          });
        } else {
          result[0] = {"announcement_text": null};
        }

        return result[0];
      } catch (error) {
        await errorHandler(ctx, error);
      }
    },
  })
);
