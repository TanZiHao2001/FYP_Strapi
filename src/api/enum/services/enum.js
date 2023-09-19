'use strict';

/**
 * enum service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::enum.enum');
