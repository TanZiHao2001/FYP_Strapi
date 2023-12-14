'use strict';

/**
 * notification router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::announcement.announcement', {
    prefix: '',
    only: ['find', 'findOne', 'create'],
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
      create: {
        auth: false,
        policies: [],
        middlewares: [],
      },
      update: {},
      delete: {},
    },
  });