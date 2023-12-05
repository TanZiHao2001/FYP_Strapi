const AdminController = require('../controllers/AdminController')

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/custom/admin-login',
      handler: AdminController.adminLogin,
      config: {
        auth: false,
      }
    }
  ]
}
