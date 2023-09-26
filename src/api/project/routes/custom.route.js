const CustomController = require('../controllers/CustomController')

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/custom/create-project',
      handler: CustomController.createProject,
      config: {
        auth: false,
      }
    },
    {
      method: 'GET',
      path: '/custom/get-project-api-collection/:id',
      handler: CustomController.getProjectAPICollection,
      config: {
        auth: false,
      }
    }
  ]
}
