'use strict';

/**
 * project-api router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::project-api.project-api');
