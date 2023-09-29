'use strict';

/**
 * error-obj service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::error-obj.error-obj');
