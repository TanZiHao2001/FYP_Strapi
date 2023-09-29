"use strict";

/**
 * http-status-code router
 */

const { createCoreRouter } = require("@strapi/strapi").factories;

module.exports = createCoreRouter("api::http-status-code.http-status-code", {
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
