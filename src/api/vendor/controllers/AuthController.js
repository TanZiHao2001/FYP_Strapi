const createError = require("http-errors");
const {verifyRefreshToken, signAccessToken, signRefreshToken} = require("../helpers/jwt_helper");
const {authSchema} = require("../helpers/validation_schema");
const cookie = require("cookie-parser")


module.exports = {
  refreshToken: async (ctx) => {
    try {
      const {refreshToken} = ctx.request.body;
      if (!refreshToken) throw strapi.errors.badRequest();

      const userId = await verifyRefreshToken(refreshToken);

      const accessToken = await signAccessToken(userId);
      const refToken = await signRefreshToken(userId);

      ctx.cookies.set('accessToken', accessToken + '', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 1 day in seconds
        path: '/',
      });

      ctx.cookies.set('refreshToken', refToken + '', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 365, // 1 year in seconds
        path: '/',
      });

      ctx.send({message: 'New access token created'});
    } catch (error) {
      // Handle errors accordingly
      ctx.response.status = error.status || 500;
      ctx.response.body = {error: error.message || 'Internal Server Error'};
    }
  },
  login: async (ctx) => {
    try {
      // TODO: Implement user authentication using Strapi's authentication mechanisms
      // For example, you can use: const user = await strapi.plugins['users-permissions'].services.user.fetch({ email });
      // and check the password using: const isMatch = await strapi.plugins['users-permissions'].services.user.validatePassword(password, user.password);
      //
      // if (!user) throw strapi.errors.notFound('User not registered');
      // if (!isMatch) throw strapi.errors.unauthorized('Username/Password invalid');

      // TODO: should put user id
      const accessToken = await signAccessToken(1);
      const refreshToken = await signRefreshToken(2);

      ctx.cookies.set('accessToken', accessToken + '', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 1 day in seconds
        path: '/',
      });

      ctx.cookies.set('refreshToken', refreshToken + '', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 365, // 1 year in seconds
        path: '/',
      });

      ctx.send({message: 'logged'});
    } catch (error) {
      if (error.details) {
        // If it's a validation error (Joi)
        ctx.response.status = 400;
        ctx.response.body = {error: 'Invalid Username/Password'};
      } else {
        // Handle other errors accordingly
        ctx.response.status = 500;
        ctx.response.body = {error: 'Internal Server Error'};
      }
    }
  },
  register: async (ctx) => {
    // try {
      console.log(ctx.request.body);

      const result = await ctx.request.body;

      // TODO: integrate MySQL (Strapi provides ORM for this)
      // const doesExist = await strapi.query('user', 'users-permissions').findOne({email: result.email});
      // if (doesExist) throw strapi.errors.conflict(`${result.email} is registered`);
      //
      // const user = await strapi.query('user', 'users-permissions').create(result);
      // TODO: add user id
      const accessToken = await signAccessToken(1);
      const refreshToken = await signRefreshToken(2);

      ctx.cookies.set('accessToken', accessToken + '', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 1 day in seconds
        path: '/',
      });

      ctx.cookies.set('refreshToken', refreshToken + '', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 365, // 1 year in seconds
        path: '/',
      });

      ctx.send({message: 'Vendor created'});
    // } catch (error) {
      // if (error.isJoi === true) {
      //   // Set the status and error message properly
      //   ctx.response.status = 422;
      //   ctx.response.body = {error: error.details[0].message};
      // } else {
      //   // Handle other errors accordingly
      //   ctx.response.status = 500;
      //   ctx.response.body = {error: 'Internal Server Error'};
      // }
    // }
  },
  logout: async (ctx) => {
    try {
      const {refreshToken} = ctx.request.body;
      if (!refreshToken) throw strapi.errors.badRequest();

      const userId = await verifyRefreshToken(refreshToken);

      // TODO: Implement logic to delete refresh token from the database

      ctx.response.status = 204; // No content
      ctx.send({message: 'logout'});
    } catch (error) {
      // Handle errors accordingly
      ctx.response.status = error.status || 500;
      ctx.response.body = {error: error.message || 'Internal Server Error'};
    }
  }
}
