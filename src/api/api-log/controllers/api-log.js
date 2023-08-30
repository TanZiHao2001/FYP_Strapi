"use strict";

/**
 * api-log controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::api-log.api-log", ({ strapi }) => ({
  async create(ctx) {
    const malaysiaTimeZoneOffset = 8; // Malaysia time is UTC+8

    const currentDate = new Date();
    const malaysiaTime = new Date(
      currentDate.getTime() + malaysiaTimeZoneOffset * 60 * 60 * 1000
    );

    const isoFormattedDate = malaysiaTime.toISOString();


    const entry = await strapi.entityService.create("api::api-log.api-log", {
      data: {
        time: isoFormattedDate,
        response_time: 2,
        response_size: 2,
        status: "success",
        publishedAt: Date.now(),
      },
    });

    ctx.send({message: "Added API log"})
  },
}));
