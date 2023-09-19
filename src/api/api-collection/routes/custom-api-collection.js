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
    }
  ]
}
