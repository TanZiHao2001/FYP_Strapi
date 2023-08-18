const createError = require("http-errors");
const {verifyRefreshToken, signAccessToken, signRefreshToken} = require("../helpers/jwt_helper");
const {authSchema} = require("../helpers/validation_schema");
const cookie = require("cookie-parser")
const {sanitize} = require('@strapi/utils')
const {contentAPI} = sanitize;
const bcrypt = require('bcryptjs');
const cron = require("node-cron");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail", // Use the email service you prefer
  auth: {
    user: "sendemail350@gmail.com",
    pass: "kjhigtncoovkicff",  //update in .env
  },
});

// Setup email data
const mailOptions = {
  from: "sendemail350@gmail.com",
  to: "yoridayaoi@gmail.com",
  subject: "Test Email",
  text: "Hello, this is a test email.",
};


cron.schedule('* * * * *', async () => {
  const result = await strapi.db.query('api::vendor.vendor').findMany({ 
    where:{
      status: {
        $eq: "Approved",
      }
    }
  });
  const emailArr = result.map(item => item.email);
  for (const email of emailArr){
    console.log(email);
  }
  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Error sending email:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
});

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
    function validateEmail(email) {
      var re = /\S+@\S+\.\S+/;
      return re.test(email);
    }
    try {
      const { email, password } = ctx.request.body;
      if(!validateEmail(email)){
        throw new Error('Please enter a valid email!');
      }
      if(email.length == 0){
        throw new Error('Email cannot be empty!');
      }
      if(password.length == 0){
        throw new Error('Password cannot be empty!');
      }
      ctx.request.query.filters = {
        email: {
            $eq: email
        }
      }

      const contentType = strapi.contentType('api::vendor.vendor')
      const sanitizedQueryParams = await contentAPI.query(ctx.query, contentType)
      const entities = await strapi.entityService.findMany(contentType.uid, sanitizedQueryParams)
      
      if(entities.length === 0){
        throw new Error('Invalid email / password');
      }
      const isPasswordValid = await bcrypt.compare(password, entities[0].password);
      if (!isPasswordValid) {
        throw new Error('Invalid email / password');
      }

      const accessToken = await signAccessToken(entities[0].id);
      const refreshToken = await signRefreshToken(entities[0].id);

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

      await strapi.entityService.update('api::vendor.vendor', entities[0].id, {
        data: {
          refresh_token: refreshToken,
        }
      });
      ctx.send({message: 'successfully logged in'});
    } catch (error) {
      if (error) {
        // If it's a validation error
        ctx.response.status = 400;
        ctx.response.body = {error: error.message};
      } else {
        // Handle other errors accordingly
        ctx.response.status = 500;
        ctx.response.body = {error: 'Internal Server Error'};
      }
    }
  },
  
  register: async (ctx) => {
    function validateEmail(email) {
      var re = /\S+@\S+\.\S+/;
      return re.test(email);
    }
    try {
      console.log(ctx.request.body);
      const { email, password, organisation } = ctx.request.body;

      if(!validateEmail(email)){
        throw new Error('Please enter a valid email!');
      }
      const result = await strapi.db.query('api::vendor.vendor').findMany({ 
        where:{
          email: {
            $eq: email,
          }
        }
      });
      console.log(result)
      if (result.length !== 0) {
        throw new Error('Email already existed!');
      }
      const entry = await strapi.entityService.create('api::vendor.vendor', {
        data:{
          email: email,
          username: email.split("@")[0],
          organisation: organisation,
          status: "Pending",
          publishedAt: Date.now()
        },
      });

      const accessToken = await signAccessToken(entry.id);
      const refreshToken = await signRefreshToken(entry.id);

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

      await strapi.entityService.update('api::vendor.vendor', entry.id, {
        data: {
          refresh_token: refreshToken,
        }
      });
      ctx.send({message: 'Vendor created'});
    } catch (error) {
      if (error) {
        // Set the status and error message properly
        ctx.response.status = 422;
        ctx.response.body = {error: error.message};
      } else {
        // Handle other errors accordingly
        ctx.response.status = 500;
        ctx.response.body = {error: 'Internal Server Error'};
      }
    }
  },

  setPassword: async (ctx) => {
    try {
      const password = ctx.request.body.password;

      if (!password || password.length <= 0){
        throw new Error('Password cannot be empty!');
      }
      await strapi.entityService.update('api::vendor.vendor', 6, {
        data: {
          password: password,
        }
      });
      ctx.send({message: 'Successful'});
    } catch (error) {
      if (error) {
        // Set the status and error message properly
        ctx.response.status = 422;
        ctx.response.body = {error: error.message};
      } else {
        // Handle other errors accordingly
        ctx.response.status = 500;
        ctx.response.body = {error: 'Internal Server Error'};
      }
    }
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
