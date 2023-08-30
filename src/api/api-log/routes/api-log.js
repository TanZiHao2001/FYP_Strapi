"use strict";

/**
 * api-log router
 */

const { createCoreRouter } = require("@strapi/strapi").factories;

module.exports = createCoreRouter("api::api-log.api-log", {
  prefix: "",
  only: ["find", "findOne", "create"],
  except: [],
  config: {
    find: {
      auth: false,
      policies: [],
      middlewares: [],
    },
    findOne: {},
    create: {
      auth: false,
      policies: [],
      middlewares: [],
    },
    update: {},
    delete: {},
  },
});
