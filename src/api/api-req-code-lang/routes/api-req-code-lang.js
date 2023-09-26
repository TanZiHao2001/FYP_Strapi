'use strict';

/**
 * api-req-code-lang router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::api-req-code-lang.api-req-code-lang', {
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
