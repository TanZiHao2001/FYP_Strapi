'use strict';

const CustomApiCollection = require('../controllers/CustomApiCollection')

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/custom/api-collections',
      handler: CustomApiCollection.apiCollection,
      config: {
        auth: false,
      }
    },
    {
      method: 'GET',
      path: '/custom/subscribed-api-collection',
      handler: CustomApiCollection.subscribedApiCollection,
      config: {
        auth: false,
      }
    },
    {
      method: 'GET',
      path: '/custom/get-param-enum',
      handler: CustomApiCollection.getParamEnum,
      config: {
        auth: false,
      }
    }

  ]
}
