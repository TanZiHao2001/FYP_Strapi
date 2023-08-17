// const express = require('express')
// const router = express.Router()
const AuthController = require('../controllers/AuthController')
//
// router.post('/register', AuthController.register)
//
// router.post('/login', AuthController.login)
//
// router.post('/refresh-token', AuthController.refreshToken)
//
// router.delete('/logout', AuthController.logout)

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/custom/register',
      handler: AuthController.register,
      config: {
        auth: false,
      }
    },
    {
      method: 'POST',
      path: '/custom/login',
      handler: AuthController.login,
      config: {
        auth: false,
      }
    },
    {
      method: 'POST',
      path: '/custom/refresh-token',
      handler: AuthController.refreshToken,
      config: {
        auth: false,
      }
    },
    {
      method: 'DELETE',
      path: '/custom/logout',
      handler: AuthController.logout,
      config: {
        auth: false,
      }
    }
  ]
}
