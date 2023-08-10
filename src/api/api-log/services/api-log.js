'use strict';

/**
 * api-log service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::api-log.api-log');
