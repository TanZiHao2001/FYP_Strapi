'use strict';

const CustomApiCollection = require('../controllers/CustomApiCollection')

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/custom/api-collections/:lang',
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
      path: '/custom/get-all-api-collection',
      handler: CustomApiCollection.getAllApiCollection,
      config: {
        auth: false
      }
    },
    {
      method: 'POST',
      path: '/custom/create-api-collection',
      handler: CustomApiCollection.createApiCollection,
      config: {
        auth: false
      }
    }
  ]
}
