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
  ]
}
