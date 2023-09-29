'use strict';

/**
 * http-status-code service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::http-status-code.http-status-code');
