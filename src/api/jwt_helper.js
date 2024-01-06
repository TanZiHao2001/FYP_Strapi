const JWT = require('jsonwebtoken')
const createError = require('http-errors')
const {sanitize} = require("@strapi/utils");
const {contentAPI} = sanitize;
const cookie = require("cookie");

module.exports = {
  signToken: (type, userId, role) => {
    return new Promise((resolve, reject) => {
      const payload = {
        aud: userId,
        role: role,
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
      JWT.verify(token, secrets[type], async (err, payload) => {
        if (err) {
          if (err.name === 'JsonWebTokenError') {
            resolve()
            return;
          } else {
            resolve()
            return;
          }
        }
        if(typeof payload === "undefined") {
          resolve(null);
          return;
        }
        if(payload.role === "ROLE_ADMIN") {
          resolve(payload.role);
          return;
        }
        const status = await strapi.entityService.findOne("api::vendor.vendor", payload.aud, {
          fields: ["status"],
        })
        if(status.status === 'Pending' || status.status === 'Rejected'){
          resolve(null);
          return;
        }
        resolve(payload.aud);
      })
    })
  },
  checkAccessAdmin: async function(ctx) {
    const parsedCookies = cookie.parse(ctx.request.header.cookie || "");
    const accessToken = parsedCookies?.accessToken;
    const adminRole = await module.exports.getVendorIdFromToken('accessToken', accessToken);
    if (adminRole === "ROLE_ADMIN") {
      return true; 
    }
    return false;
  },
  checkAccessVendor: async function(ctx) {
    const parsedCookies = cookie.parse(ctx.request.header.cookie || "");
    const accessToken = parsedCookies?.accessToken;
    const vendorId = await module.exports.getVendorIdFromToken('accessToken', accessToken);
    if (typeof vendorId === "number") {
      return vendorId; 
    }
    return null;
  }
}
