const JWT = require('jsonwebtoken')
const createError = require('http-errors')

module.exports = {
  signAccessToken: (userId) => {
    return new Promise((resolve, reject) => {
      const payload = {
        aud: userId,
        iss: 'angular.com'
      }
      const secret = process.env.ACCESS_TOKEN_SECRET
      const option = {
        expiresIn: "1d"
      }
      JWT.sign(payload, secret, option, (err, token) => {
        if (err) {
          console.log(err.message)
          reject(createError.InternalServerError())
        }
        resolve(token)
      })
    })
  },
  signRefreshToken: (userId) => {
    return new Promise((resolve, reject) => {
      const payload = {
        aud: userId,
        iss: 'angular.com'
      }
      const secret = process.env.REFRESH_TOKEN_SECRET
      const option = {
        expiresIn: "1y"
      }
      JWT.sign(payload, secret, option, (err, token) => {
        if (err) {
          console.log(err.message)
          reject(createError.InternalServerError())
        }
        resolve(token)
      })
    })
  },
  getVendorIdFromToken: (type, token) => {
    return new Promise((resolve, reject) => {
      if (!token) return new Error ('No token!')
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
