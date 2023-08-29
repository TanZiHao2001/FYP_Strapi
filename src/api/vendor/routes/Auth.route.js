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
      path: '/custom/setPassword',
      handler: AuthController.setPassword,
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
    },
    {
      method: 'POST',
      path: '/custom/check-is-expired',
      handler: AuthController.checkIsExpired,
      config: {
        auth: false,
      }
    },
    {
      method: 'POST',
      path: '/custom/sendEmail',
      handler: AuthController.sendEmail,
      config: {
        auth: false,
      }
    },
    {
      method: 'POST',
      path: '/custom/checkToken',
      handler: AuthController.checkToken,
      config: {
        auth: false,
      }
    },
  ]
}
