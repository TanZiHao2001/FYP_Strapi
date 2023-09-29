'use strict';

/**
 * error-type service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::error-type.error-type');
