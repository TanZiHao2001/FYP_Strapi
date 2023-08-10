'use strict';

/**
 * api controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::api.api');
