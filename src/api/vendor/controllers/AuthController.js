const createError = require("http-errors");
const {signAccessToken, signRefreshToken, getVendorIdFromToken} = require("../../jwt_helper");
const cookie = require("cookie-parser");
const {sanitize} = require("@strapi/utils");
const {contentAPI} = sanitize;
const bcrypt = require("bcryptjs");
const cron = require("node-cron");
const nodemailer = require("nodemailer");
const JWT = require('jsonwebtoken')

const transporter = nodemailer.createTransport({
  service: "Gmail", // Use the email service you prefer
  auth: {
    user: "sendemail350@gmail.com",
    pass: "kjhigtncoovkicff", //update in .env
  },
});

cron.schedule("0 8 * * 1-5", async () => {
  const result = await strapi.db.query("api::vendor.vendor").findMany({
    where: {
      status: {
        $eq: "Approved",
      },
    },
  });

  const emailArr = result.map((item) => item.email);
  const id = result.map((item) => item.id);
  const verifyToken = await signAccessToken(id[0]);
  const link = `http://localhost:4200/sign/set-up-password?token=${verifyToken}`;

  const output = `
  <html>
    <head>
      <style>
        .button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #3498db;
          color: #ffffff;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
          text-align: center;
          text-decoration: none;
        }
        .button:hover {
          background-color: #2980b9;
        }
      </style>
    </head>
    <body>
      <h1>You have been approved! Follow the link to set your password.</h1>
      <a href="${link}" class="button">Click here to set password</a>
      <h3>This is a test</h3>
    </body>
  </html>
`;
  console.log(verifyToken);
  // Setup email data
  const mailOptions = {
    from: "sendemail350@gmail.com",
    to: "yoridayaoi@gmail.com",
    subject: "Test Email",
    html: output,
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Error sending email:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
});

function validateEmail(email) {
  var re = /\S+@\S+\.\S+/;
  return re.test(email);
}

function setToken(ctx, key, value) {
  ctx.cookies.set(key, value, {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: key === 'accessToken' ? 60 * 60 * 24 * 1000 * 365 : 60 * 60 * 24 * 1000 * 365, // 1 year in seconds
    path: "/",
  });
}

module.exports = {
  refreshToken: async (ctx) => {
    try {
      const {refreshToken} = ctx.request.body;
      if (!refreshToken) throw strapi.errors.badRequest();

      const userId = await getVendorIdFromToken('refreshToken', refreshToken);

      const accessToken = await signAccessToken(userId);
      const refToken = await signRefreshToken(userId);

      setToken(ctx, 'accessToken', accessToken);
      setToken(ctx, 'refreshToken', refToken);

      ctx.send({message: "New access token created"});
    } catch (error) {
      // Handle errors accordingly
      ctx.response.status = error.status || 500;
      ctx.response.body = {error: error.message || "Internal Server Error"};
    }
  },
  login: async (ctx) => {
    try {
      const {email, password} = ctx.request.body;
      if (!validateEmail(email)) {
        throw new Error("Please enter a valid email!");
      }
      if (email.length === 0) {
        throw new Error('Email cannot be empty!');
      }
      if (password.length === 0) {
        throw new Error('Password cannot be empty!');
      }
      ctx.request.query.filters = {
        email: {
          $eq: email,
        },
      };

      const contentType = strapi.contentType("api::vendor.vendor");
      const sanitizedQueryParams = await contentAPI.query(
        ctx.query,
        contentType
      );
      const entities = await strapi.entityService.findMany(
        contentType.uid,
        sanitizedQueryParams
      );

      if (entities.length === 0) {
        throw new Error("Invalid email / password");
      }

      const isPasswordValid = await bcrypt.compare(
        password,
        entities[0].password
      );
      if (!isPasswordValid) {
        throw new Error("Invalid email / password");
      }

      const accessToken = await signAccessToken(entities[0].id);
      const refreshToken = await signRefreshToken(entities[0].id);

      setToken(ctx, 'accessToken', accessToken);
      setToken(ctx, 'refreshToken', refreshToken);

      await strapi.entityService.update("api::vendor.vendor", entities[0].id, {
        data: {
          refresh_token: refreshToken,
        },
      });
      ctx.send({message: "successfully logged in"});
    } catch
      (error) {
      if (error) {
        // If it's a validation error
        ctx.response.status = 200; //initially 400
        ctx.response.body = {error: error.message};
      } else {
        // Handle other errors accordingly
        ctx.response.status = 200; //500
        ctx.response.body = {error: "Internal Server Error"};
      }
    }
  },
  register: async (ctx) => {
    try {
      console.log(ctx.request.body);
      const {email, password, organisation} = ctx.request.body;

      if (!validateEmail(email)) {
        throw new Error("Please enter a valid email!");
      }
      const result = await strapi.db.query('api::vendor.vendor').findMany({
        where: {
          email: {
            $eq: email,
          },
        },
      });
      console.log(result);
      if (result.length !== 0) {
        throw new Error("Email already existed!");
      }
      const entry = await strapi.entityService.create("api::vendor.vendor", {
        data: {
          email: email,
          username: email.split("@")[0],
          organisation: organisation,
          status: "Pending",
          publishedAt: Date.now(),
        },
      });

      const accessToken = await signAccessToken(entry.id);
      const refreshToken = await signRefreshToken(entry.id);

      setToken(ctx, 'accessToken', accessToken);
      setToken(ctx, 'refreshToken', refreshToken);

      await strapi.entityService.update("api::vendor.vendor", entry.id, {
        data: {
          refresh_token: refreshToken,
        },
      });
      ctx.send({message: "Vendor created"});
    } catch
      (error) {
      if (error) {
        // Set the status and error message properly
        ctx.response.status = 200; //422
        ctx.response.body = {error: error.message};
      } else {
        // Handle other errors accordingly
        ctx.response.status = 200; //500
        ctx.response.body = {error: "Internal Server Error"};
      }
    }
  },
  setPassword: async (ctx) => {
    try {
      const {password, verifyToken} = ctx.request.body;
      var id = -1;
      if (!password || password.length <= 0) {
        throw new Error("Password cannot be empty!");
      }

      if (!verifyToken) {
        throw new Error('Token not found!');
      }

      id = await getVendorIdFromToken('accessToken', verifyToken);

      await strapi.entityService.update("api::vendor.vendor", id, {
        data: {
          password: password,
        },
      });
      ctx.send({message: "Successful"});
    } catch (error) {
      if (error) {
        // Set the status and error message properly
        ctx.response.status = 200; //422
        ctx.response.body = {error: error.message};
      } else {
        // Handle other errors accordingly
        ctx.response.status = 200; //500
        ctx.response.body = {error: "Internal Server Error"};
      }
    }
  },
  logout: async (ctx) => {
    try {
      const {refreshToken} = ctx.request.body;
      if (!refreshToken) throw strapi.errors.badRequest();

      const userId = await getVendorIdFromToken('refreshToken', refreshToken);

      // TODO: Implement logic to delete refresh token from the database

      ctx.response.status = 204; // No content
      ctx.send({message: "logout"});
    } catch (error) {
      // Handle errors accordingly
      ctx.response.status = error.status || 500;
      ctx.response.body = {error: error.message || "Internal Server Error"};
    }
  },
  checkIsExpired: async (ctx) => {
    try {
      const parsedCookies = cookie.parse(ctx.request.header.cookie);
      const accessToken = parsedCookies.accessToken;

      const isTokenExpired = (accessToken) => (Date.now() >= JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString()).exp * 1000)

      console.log(isTokenExpired)

      ctx.send({message: "valid"});
    } catch (error) {
      // Handle errors accordingly
      ctx.response.status = error.status || 500;
      ctx.response.body = {error: error.message || "Internal Server Error"};
    }
  }
};
