'use strict';

/**
 * code-lang-option router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::code-lang-option.code-lang-option', {
  prefix: '',
  only: ['find', 'findOne'],
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
