'use strict';

const CustomApiCollection = require('../controllers/CustomApiCategory')

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/custom/get-all-api-category',
      handler: CustomApiCollection.getAllApiCategory,
      config: {
        auth: false
      }
    },
  ]
}
