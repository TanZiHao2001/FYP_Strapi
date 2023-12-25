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
          fields: ["announcement_text", "createdAt", "startDate"],
          publicationState: 'live',
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
          result.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
          result.forEach((item) => {
            delete item.id
          });
        } else {
          result[0] = {"announcement_text": null};
        }

        return [result[0], result[1], result[2]];
      } catch (error) {
        await errorHandler(ctx, error);
      }
    },
    async findOne(ctx) {
      try {
        const id = ctx.params.id
        const result = await strapi.entityService.findOne("api::announcement.announcement", id, {
          fields: ["title", "description", "announcement_text", "startDate", "endDate", "color"],
          publicationState: "live"
        })
        return result;
      } catch (error) {
        await errorHandler(ctx, error);
      }
    }
  })
);
