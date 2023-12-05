const CustomController = require('../controllers/CustomController')

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/custom/updateProfile',
      handler: CustomController.updateProfile,
      config: {
        auth: false,
      }
    },
    {
      method: 'POST',
      path: '/custom/changePassword',
      handler: CustomController.changePassword,
      config: {
        auth: false,
      }
    },
    {
      method: 'GET',
      path: '/custom/getVendorList',
      handler: CustomController.getVendorList,
      config: {
        auth: false
      }
    },
    {
      method: 'POST',
      path: '/custom/create-user',
      handler: CustomController.createUser,
      config: {
        auth: false
      }
    }
  ]
}
