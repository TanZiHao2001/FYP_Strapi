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
    },
    {
      method: 'DELETE',
      path: '/custom/delete-project/:id',
      handler: CustomController.deleteProject,
      config: {
        auth: false,
      }
    },
    {
      method: 'GET',
      path: '/custom/get-project-details/:id',
      handler: CustomController.getProjectDetails,
      config: {
        auth: false,
      }
    },
    {
      method: 'POST',
      path: '/custom/update-project/:id',
      handler: CustomController.updateProject,
      config: {
        auth: false,
      }
    },
    {
      method: 'POST',
      path: '/custom/request-project-token',
      handler: CustomController.requestProjectToken,
      config: {
        auth: false,
      }
    },
    {
      method: 'GET',
      path: '/custom/get-all-project-tokens/:id',
      handler: CustomController.getAllProjectTokens,
      config: {
        auth: false,
      }
    },
    {
      method: 'GET',
      path: '/custom/get-user-project-table/:id',
      handler: CustomController.getUserProjectTable,
      config: {
        auth: false,
      }
    },
    {
      method: 'POST',
      path: '/custom/block-user-project',
      handler: CustomController.blockUserProjectTable,
      config: {
        auth: false,
      }
    },
    {
      method: 'POST',
      path: '/custom/unblock-user-project',
      handler: CustomController.unblockUserProjectTable,
      config: {
        auth: false,
      }
    }
  ]
}
