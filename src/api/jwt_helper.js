const JWT = require('jsonwebtoken')
const createError = require('http-errors')

module.exports = {
  signToken: (type, userId) => {
    return new Promise((resolve, reject) => {
      const payload = {
        aud: userId,
        iss: 'angular.com'
      }
      const secret = type === 'accessToken' ? process.env.ACCESS_TOKEN_SECRET : process.env.REFRESH_TOKEN_SECRET
      const option = {
        expiresIn: type === 'accessToken' ? "1d" : "1y"
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
      if (!token) return new Error('No token!')
      JWT.verify(token, type === 'accessToken' ? process.env.ACCESS_TOKEN_SECRET : process.env.REFRESH_TOKEN_SECRET, (err, payload) => {
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