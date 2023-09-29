"use strict";

/**
 * error-obj router
 */

const { createCoreRouter } = require("@strapi/strapi").factories;

module.exports = createCoreRouter("api::error-obj.error-obj", {
  prefix: "",
  only: ["find", "findOne"],
  except: [],
  config: {
    find: {
      auth: false,
      policies: [],
      middlewares: [],
    },
    findOne: {
      auth: false,
      policies: [],
      middlewares: [],
    },
    create: {},
    update: {},
    delete: {},
  },
});
