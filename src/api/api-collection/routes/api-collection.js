'use strict';

/**
 * api-collection router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::api-collection.api-collection', {
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