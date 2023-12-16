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
    },
    {
      method: 'POST',
      path: '/custom/block-vendor',
      handler: CustomController.blockVendor,
      config: {
        auth: false
      }
    },
    {
      method: 'POST',
      path: '/custom/unblock-vendor',
      handler: CustomController.unblockVendor,
      config: {
        auth: false
      }
    },
    {
      method: 'GET',
      path: '/custom/get-all-user/:days?',
      handler: CustomController.getTotalUser,
      config: {
        auth: false,
      }
    },
    {
      method: 'GET',
      path: '/custom/get-new-user',
      handler: CustomController.getNewUser,
      config: {
        auth: false
      }
    },
    {
      method: 'GET',
      path: '/custom/get-non-active-user',
      handler: CustomController.getNonActiveUser,
      config: {
        auth: false
      }
    },
    {
      method: 'GET',
      path: '/custom/get-user-data',
      handler: CustomController.getActiveNonActiveNewUserData,
      config: {
        auth: false
      }
    },
    { 
      method: 'GET',
      path: '/custom/get-one-user/:id',
      handler: CustomController.getOneUser,
      config: {
        auth: false
      }
    },
    {
      method: 'POST',
      path: '/custom/get-one-user-access-control/:char',
      handler: CustomController.getOneUserAccessControl,
      config: {
        auth: false,
      }
    },
    {
      method: 'POST',
      path: '/custom/set-one-user-access-control',
      handler: CustomController.setOneUserAccessControl,
      config: {
        auth: false
      }
    }
  ]
}
