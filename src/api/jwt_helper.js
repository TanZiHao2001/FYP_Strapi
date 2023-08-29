const JWT = require('jsonwebtoken')
const createError = require('http-errors')

module.exports = {
  signToken: (type, userId) => {
    return new Promise((resolve, reject) => {
      const payload = {
        aud: userId,
        iss: 'angular.com'
      }
      const secrets = {
        accessToken: process.env.ACCESS_TOKEN_SECRET,
        refreshToken: process.env.REFRESH_TOKEN_SECRET,
        verifyToken: process.env.VERIFY_TOKEN_SECRET
      };
      const secret = secrets[type]
      const option = {
        expiresIn: type === 'refreshToken' ? "1y" : "1d"
      }
      JWT.sign(payload, secret, option, (err, token) => {
        if (err) {
          reject(createError.InternalServerError())
        }
        resolve(token)
      })
    })
  },
  getVendorIdFromToken: (type, token) => {
    return new Promise((resolve, reject) => {
      if (!token) resolve()
      const secrets = {
        accessToken: process.env.ACCESS_TOKEN_SECRET,
        refreshToken: process.env.REFRESH_TOKEN_SECRET,
        verifyToken: process.env.VERIFY_TOKEN_SECRET
      };
      JWT.verify(token, secrets[type], (err, payload) => {
        if (err) {
          if (err.name === 'JsonWebTokenError') {
            resolve()
          } else {
            resolve()
          }
        }
        resolve(payload.aud)
      })
    })
  },
}
