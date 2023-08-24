'use strict';

/**
 * guide router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

// module.exports = createCoreRouter('api::guide.guide');
module.exports = createCoreRouter('api::guide.guide', {
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