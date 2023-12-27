'use strict';

const CustomApiCategory = require('../controllers/CustomApiCategory')

module.exports = {
  routes: [
    {
        method: 'GET',
        path: '/custom/get-all-api-category/:char',
        handler: CustomApiCategory.getAllApiCategoryByChar,
        config: {
            auth: false
        }
    },
    {
        method: 'GET',
        path: '/custom/get-all-api-category',
        handler: CustomApiCategory.getAllApiCategory,
        config: {
            auth: false
        }
    },
    {
        method: 'POST',
        path: '/custom/create-api-category',
        handler: CustomApiCategory.createApiCategory,
        config: {
            auth: false
        }
    },
    {
        method: 'DELETE',
        path: '/custom/delete-api-category/:id',
        handler: CustomApiCategory.deleteApiCategory,
        config: {
            auth: false
        }
    },
    
  ]
}
