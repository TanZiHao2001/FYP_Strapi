const JWT = require('jsonwebtoken')
const createError = require('http-errors')

module.exports = {
  getVendorIdFromAccessToken: (accessToken) => {
    return new Promise((resolve, reject) => {
      if (!accessToken) return next(createError.Unauthorized())
      JWT.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
        if (err) {
          if (err.name === 'JsonWebTokenError') {
            return next(createError.Unauthorized())
          } else {
            return next(createError.Unauthorized(err.message))
          }
        }
        resolve(payload.aud)
      })
    })
  }
}
