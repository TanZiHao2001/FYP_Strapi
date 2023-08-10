'use strict';

/**
 * api service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::api.api');
