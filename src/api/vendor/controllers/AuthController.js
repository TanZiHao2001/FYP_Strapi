const {signToken, getVendorIdFromToken} = require("../../jwt_helper");
const cookie = require("cookie");
const {sanitize} = require("@strapi/utils");
const {contentAPI} = sanitize;
const createError = require("http-errors");
const {errorHandler} = require('../../error_helper');
const bcrypt = require("bcryptjs");
const cron = require("node-cron");
const nodemailer = require("nodemailer");
const {filter} = require("../../../../config/middlewares");
const { create } = require("tar");

const transporter = nodemailer.createTransport({
  service: "Gmail", // Use the email service you prefer
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASS
  },
});
//0 8 * * 1-5
//every morning 8am monday till friday
cron.schedule("0 8 * * 1-5", async () => {
  const result = await strapi.entityService.findMany("api::vendor.vendor", {
    filters: {
      status: "Approved",
      activatedTime: {
        $null: true,
      }
    },
  });

  if (result.length === 0) {
    return;
  }

  const filteredResult = result.filter((user) => {
    return user.password === null &&
    (Date.now() - new Date(user.emailSentTime).getTime()) >= (24 * 60 * 60 * 1000);
  });

  if (filteredResult.length === 0) {
    return;
  }
  const idAndEmail = filteredResult.map((item) => ({id: item.id, email: item.email}));
  idAndEmail.forEach(async (item) => {
    const verifyToken = await signToken("verifyToken", item.id);
    const link = `${process.env.FRONTEND_EMAIL}/sign/set-up-password?token=${verifyToken}`
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
    // Setup email data
    const mailOptions = {
      from: process.env.NODEMAILER_EMAIL,
      to: item.email,
      subject: "Set Up Your Pasword",
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

    const changeStatus = await strapi.entityService.update('api::vendor.vendor', item.id, {
      data: {
        status: "Approved",
        emailSentTime: Date.now(),
      },
    })
  })
}, {
  scheduled: true,
  timezone: "Asia/Kuala_Lumpur"
});

function validateEmail(email) {
  var re = /\S+@\S+\.\S+/;
  return re.test(email);
}

function setToken(ctx, key, value) {
  ctx.cookies.set(key, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    maxAge:
      key === "refreshToken" ? 60 * 60 * 24 * 1000 * 365 : 60 * 60 * 24 * 1000,
    path: "/",
  });
}

function getAbbreviation(userName) {
  const words = userName.split(' ');
  let abbreviation = '';

  for (const word of words) {
    if (word.length > 0) {
      abbreviation += word[0].toUpperCase();
    }
    if (abbreviation.length > 1) {
      break;
    }
  }
  return abbreviation;
}

module.exports = {
  refreshToken: async (ctx) => {
    try {
      const {refreshToken} = ctx.request.body;
      if (!refreshToken) throw createError.BadRequest()

      const vendorId = await getVendorIdFromToken("refreshToken", refreshToken);
      if (!vendorId) {
        throw createError.Unauthorized();
      }

      const accessToken = await signToken("accessToken", vendorId);
      const refToken = await signToken("refreshToken", vendorId);

      setToken(ctx, "accessToken", accessToken);
      setToken(ctx, "refreshToken", refToken);

      ctx.send({message: "New access token created"});
    } catch (error) {
      await errorHandler(ctx, error)
    }
  },
  login: async (ctx) => {
    try {
      const {email, password} = ctx.request.body;
      if (!email || !password || !validateEmail(email)) {
        throw createError.BadRequest();
      }

      let emailList, passwordList;
      if(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD){
        emailList = JSON.parse(process.env.ADMIN_EMAIL);
        passwordList = JSON.parse(process.env.ADMIN_PASSWORD);
      }

      for(let i = 0; i < emailList.length; i++) {
        if(email === emailList[i] && password === passwordList[i]) {
          const accessToken = await signToken("accessToken", 0, "ROLE_ADMIN");
          const refreshToken = await signToken("refreshToken", 0, "ROLE_ADMIN");
          setToken(ctx, "accessToken", accessToken);
          setToken(ctx, "refreshToken", refreshToken);
          return ctx.send({message: "successfully logged in"});
        }
      }
      const contentType = strapi.contentType("api::vendor.vendor");

      const entry = await strapi.db.query(contentType.uid).findOne({
        where: {email: email},
      });

      if (!entry || entry.password === null) {
        return ctx.send({error: "Invalid email / password"});
      }

      if(entry.publishedAt === null || entry.status === 'Rejected' || entry.status === "Pending"){
        return ctx.send({error: "Account has been blocked, please contact admin"});
      }

      const isPasswordValid = await bcrypt.compare(password, entry.password);

      if (!isPasswordValid) {
        return ctx.send({error: "Invalid email / password"});
      }

      const accessToken = await signToken("accessToken", entry.id, "ROLE_VENDOR");
      const refreshToken = await signToken("refreshToken", entry.id);
      ctx.cookies.set('abbre', getAbbreviation(entry.username), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production" ? true : false,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 60 * 60 * 24 * 1000,
        path: "/",
      });
      setToken(ctx, "accessToken", accessToken);
      setToken(ctx, "refreshToken", refreshToken);

      await strapi.entityService.update("api::vendor.vendor", entry.id, {
        data: {
          refresh_token: refreshToken,
          lastLoginTime: Date.now(),
        },
      });
      return ctx.send({message: "successfully logged in"});
    } catch (error) {
      await errorHandler(ctx, error)
    }
  },
  register: async (ctx) => {
    try {
      const {email, password, organisation} = ctx.request.body;

      if (!validateEmail(email)) {
        throw new Error("Please enter a valid email!");
      }
      const result = await strapi.db.query("api::vendor.vendor").findMany({
        where: {
          email: {
            $eq: email,
          },
        },
      });

      if (result.length !== 0) {
        return ctx.send({error: "Email already existed!"});
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

      const verifyToken = await signToken("verifyToken", entry.id);
      setToken(ctx, "verifyToken", verifyToken);

      ctx.send({message: "Account has been created, an activation email will be sent once approved by admin"});
    } catch (error) {
      await errorHandler(ctx, error)
    }
  },
  setPassword: async (ctx) => {
    try {
      const {password, token} = ctx.request.body;
      let id;
      if (!password || password.length <= 0) {
        throw new Error("Password cannot be empty!");
      }

      if (!token) {
        throw new Error("Token not found!");
      }

      id = await getVendorIdFromToken("verifyToken", token);
      if (!id) {
        throw new Error("No such user!");
      }

      const accessToken = await signToken("accessToken", id);
      const refreshToken = await signToken("refreshToken", id);

      setToken(ctx, "accessToken", accessToken);
      setToken(ctx, "refreshToken", refreshToken);

      ctx.cookies.set("verifyToken", null, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 0,
        expires: new Date(0),
        path: "/",
      });

      const user = await strapi.entityService.findOne("api::vendor.vendor", id)
      if(user.publishedAt === null){
        throw new Error("Account has been blocked, please contact admin");
      }

      await strapi.entityService.update("api::vendor.vendor", id, {
        data: {
          password: password,
          refresh_token: refreshToken,
          status: "Approved",
          activatedTime: Date.now()
        },
      });
      ctx.send({message: "Successful"});
    } catch (error) {
      await errorHandler(ctx, error)
    }
  },
  logout: async (ctx) => {
    try {
      const parsedCookies = cookie.parse(ctx.request.header.cookie || "");
      const refreshToken = parsedCookies?.refreshToken;
      const accessToken = parsedCookies?.accessToken;

      if (!refreshToken && !accessToken) {
        ctx.send({message: "logout successful"})
        return
      }

      const vendorId = await getVendorIdFromToken("refreshToken", refreshToken);
      if (!vendorId) {
        throw createError.Unauthorized();
      }

      await strapi.entityService.update("api::vendor.vendor", vendorId, {
        data: {
          refresh_token: "",
        },
      });

      ctx.cookies.set("accessToken", null, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" ? true : false,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 0,
        expires: new Date(0),
        path: "/",
      });

      ctx.cookies.set("refreshToken", null, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" ? true : false,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 0,
        expires: new Date(0),
        path: "/",
      });

      ctx.cookies.set("abbre", null, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production" ? true : false,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 0,
        expires: new Date(0),
        path: "/",
      });

      ctx.send({message: "logout successful"});
    } catch (error) {
      await errorHandler(ctx, error)
    }
  },
  checkIsExpired: async (ctx) => {
    try {
      if (ctx.request.header.cookie === undefined) {
        throw new Error();
      }

      const parsedCookies = cookie.parse(ctx.request.header.cookie);
      const accessToken = parsedCookies.accessToken;

      if (!accessToken) {
        throw new Error();
      }

      const token_result = await getVendorIdFromToken("accessToken", accessToken);
      const role = token_result === "ROLE_ADMIN" ? token_result : "ROLE_VENDOR";
      const isAuthenticated = token_result ? true : false;

      return {role: role, isAuthenticated: isAuthenticated};

    } catch (error) {
      if (error.message) {
        ctx.response.status = error.status || 500;
        ctx.response.body = {error: error.message};
      } else {
        ctx.send({role: "GUEST", isAuthenticated: false});
      }
    }
  },
  sendEmail: async (ctx) => {
    try {
      const {email} = ctx.request.body;

      if (!validateEmail(email)) {
        throw new Error("Please enter a valid email!");
      }

      const result = await strapi.db.query("api::vendor.vendor").findMany({
        where: {
          email: {
            $eq: email,
          },
        },
      });

      if (result.length === 0) {
        return ctx.send({error: "No such email!"});
      }

      const verifyToken = await signToken("verifyToken", result[0].id);
      const link =
        result[0].password == null
          // ? `http://localhost:4200/sign/set-up-password?token=${verifyToken}`
          // ? `http://fyp-frontend-939df.web.app/sign/set-up-password?token=${verifyToken}`
          // : `http://fyp-frontend-939df.web.app/sign/reset-password?token=${verifyToken}`
          ? `${process.env.FRONTEND_URL}/sign/set-up-password?token=${verifyToken}`
          : `${process.env.FRONTEND_URL}/sign/reset-password?token=${verifyToken}`
          // ? `http://192.168.102.118:4200/sign/set-up-password?token=${verifyToken}`
          // : `http://192.168.102.118:4200/sign/reset-password?token=${verifyToken}`;

      const message =
        result[0].password == null
          ? "<h1>You have been approved! Follow the link to set your password.</h1>"
          : "<h1>Follow the link to reset your password.</h1>";

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
          ${message}
          <a href="${link}" class="button">Click here to set password</a>
          <h3>This is a test</h3>
        </body>
      </html>
    `;

      // Setup email data
      const mailOptions = {
        from: process.env.NODEMAILER_EMAIL,
        to: email,
        subject: result[0].password == null ? "Set Up Your Password" : "Reset Your Password",
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

      const entry = await strapi.entityService.update('api::vendor.vendor', result[0].id, {
        data: {
          status: "Approved",
          emailSentTime: Date.now(),
        }
      });
      ctx.send({message: "Email sent"});
    } catch (error) {
      await errorHandler(ctx, error)
    }
  },
  checkToken: async (ctx) => {
    try {
      const {verifyToken} = ctx.request.body;

      if (!verifyToken) {
        throw new Error("No token!");
      }

      const id = await getVendorIdFromToken("verifyToken", verifyToken);
      if (!id) {
        throw new Error("Invalid Token!");
      }

      return true;
    } catch (error) {
      return false;
    }
  },
};

