'use strict';

/**
 * project-api service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::project-api.project-api');
