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
      method: 'POST',
      path: '/custom/api-collections',
      handler: CustomApiCollection.getOneapiCollection,
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
    },
    {
      method: 'DELETE',
      path: '/custom/delete-api-collection/:id',
      handler: CustomApiCollection.deleteApiCollection,
      config: {
        auth: false
      }
    },
    {
      method: 'POST',
      path: '/custom/upload-file-content',
      handler: CustomApiCollection.getFileContent,
      config: {
        auth: false
      }
    },
    {
      method: 'POST',
      path: '/custom/publish-api-collection',
      handler: CustomApiCollection.publishApiCollection,
      config: {
        auth: false
      }
    }
  ]
}
