const { signToken, getVendorIdFromToken } = require("../../jwt_helper");
const cookie = require("cookie");
const { sanitize } = require("@strapi/utils");
const { contentAPI } = sanitize;
const createError = require("http-errors");
const bcrypt = require("bcryptjs");
const cron = require("node-cron");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail", // Use the email service you prefer
  auth: {
    user: "sendemail350@gmail.com",
    pass: "kjhigtncoovkicff", //update in .env
  },
});
//0 8 * * 1-5
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
  const verifyToken = await signToken("verifyToken", id[0]);
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
    maxAge:
      key === "refreshToken" ? 60 * 60 * 24 * 1000 * 365 : 60 * 60 * 24 * 1000,
    path: "/",
  });
}

module.exports = {
  refreshToken: async (ctx) => {
    try {
      const { refreshToken } = ctx.request.body;
      if (!refreshToken) throw strapi.errors.badRequest();

      const vendorId = await getVendorIdFromToken("refreshToken", refreshToken);
      if (!vendorId) {
        throw new Error("Unauthorised!");
      }

      const accessToken = await signToken("accessToken", vendorId);
      const refToken = await signToken("refreshToken", vendorId);

      setToken(ctx, "accessToken", accessToken);
      setToken(ctx, "refreshToken", refToken);

      ctx.send({ message: "New access token created" });
    } catch (error) {
      // Handle errors accordingly
      ctx.response.status = error.status || 500;
      ctx.response.body = { error: error.message || "Internal Server Error" };
    }
  },
  login: async (ctx) => {
    try {
      const { email, password } = ctx.request.body;
      if (!email || !password || !validateEmail(email)) {
        throw createError.BadRequest();
      }

      const contentType = strapi.contentType("api::vendor.vendor");

      const entry = await strapi.db.query(contentType.uid).findOne({
        where: { email: email },
      });

      if (!entry || entry.password === null) {
        return ctx.send({ error: "Invalid email / password" });
      }

      const isPasswordValid = await bcrypt.compare(password, entry.password);

      if (!isPasswordValid) {
        return ctx.send({ error: "Invalid email / password" });
      }

      const accessToken = await signToken("accessToken", entry.id);
      const refreshToken = await signToken("refreshToken", entry.id);

      setToken(ctx, "accessToken", accessToken);
      setToken(ctx, "refreshToken", refreshToken);

      await strapi.entityService.update("api::vendor.vendor", entry.id, {
        data: {
          refresh_token: refreshToken,
        },
      });
      return ctx.send({ message: "successfully logged in" });
    } catch (error) {
      if (error.status === 500) {
        ctx.response.status = error.status;
        ctx.response.body = { error: "Internal Server Error" };
      } else {
        ctx.response.status = error.status || 500;
        ctx.response.body = { error: error.message || "Internal Server Error" };
      }
    }
  },
  register: async (ctx) => {
    try {
      const { email, password, organisation } = ctx.request.body;

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

      const verifyToken = await signToken("verifyToken", entry.id);
      setToken(ctx, "verifyToken", verifyToken);

      ctx.send({ message: "Vendor created" });
    } catch (error) {
      if (error) {
        // Set the status and error message properly
        ctx.response.status = 200; //422
        ctx.response.body = { error: error.message };
      } else {
        // Handle other errors accordingly
        ctx.response.status = 200; //500
        ctx.response.body = { error: "Internal Server Error" };
      }
    }
  },
  setPassword: async (ctx) => {
    try {
      const { password, verifyToken } = ctx.request.body;
      let id;
      // const parsedCookies = cookie.parse(ctx.request.header.cookie);
      // const verifyToken = parsedCookies.verifyToken;

      if (!password || password.length <= 0) {
        throw new Error("Password cannot be empty!");
      }

      if (!verifyToken) {
        throw new Error("Token not found!");
      }

      id = await getVendorIdFromToken("verifyToken", verifyToken);
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

      await strapi.entityService.update("api::vendor.vendor", id, {
        data: {
          password: password,
          refresh_token: refreshToken,
        },
      });
      ctx.send({ message: "Successful" });
    } catch (error) {
      if (error) {
        // Set the status and error message properly
        ctx.response.status = 200; //422
        ctx.response.body = { error: error.message };
      } else {
        // Handle other errors accordingly
        ctx.response.status = 200; //500
        ctx.response.body = { error: "Internal Server Error" };
      }
    }
  },
  logout: async (ctx) => {
    try {

      const parsedCookies = cookie.parse(ctx.request.header.cookie || "");
      const refreshToken = parsedCookies?.refreshToken;
      const accessToken = parsedCookies?.accessToken;
    
      if (!refreshToken && !accessToken) {
        ctx.response.status = 204;
        ctx.send({ message: "logout successful" })
        return
      }
      //ctx.badRequest('Token is missing', { foo: 'bar' });

      const vendorId = await getVendorIdFromToken("refreshToken", refreshToken);
      if (!vendorId) {
        throw new Error("Unauthorised!");
      }

      await strapi.entityService.update("api::vendor.vendor", vendorId, {
        data: {
          refresh_token: "",
        },
      });

      ctx.cookies.set("accessToken", null, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 0,
        expires: new Date(0),
        path: "/",
      });

      ctx.cookies.set("refreshToken", null, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 0,
        expires: new Date(0),
        path: "/",
      });

      ctx.response.status = 204; // No content
      ctx.send({ message: "logout successful" });
    } catch (error) {
      // Handle errors accordingly
      if (error) {
        ctx.response.status = 200; //204
        ctx.response.body = { error: error.message };
        //ctx.send({error: error.message});
      }
      ctx.response.status = error.status || 500;
      ctx.response.body = { error: error.message || "Internal Server Error" };
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
      } else {
        const vendorId = await getVendorIdFromToken("accessToken", accessToken);
        vendorId ? ctx.send(true) : ctx.send(false);
      }
    } catch (error) {
      if (error.message) {
        ctx.response.status = error.status || 500;
        ctx.response.body = { error: error.message };
      } else {
        ctx.send(false);
      }
    }
  },
  sendEmail: async (ctx) => {
    try {
      const { email } = ctx.request.body;

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
        throw new Error("No such email!");
      }

      const verifyToken = await signToken("verifyToken", result[0].id);
      const link =
        result[0].password == null
          ? `http://localhost:4200/sign/set-up-password?token=${verifyToken}`
          : `http://localhost:4200/sign/reset-password?token=${verifyToken}`;

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

      ctx.send({ message: "Email sent" });
    } catch (error) {
      ctx.response.body = { error: error.message };
    }
  },
  checkToken: async (ctx) => {
    try {
      const { verifyToken } = ctx.request.body;

      if (!verifyToken) {
        throw new Error("No token!");
      }

      const id = await getVendorIdFromToken("verifyToken", verifyToken);
      console.log(id);
      if (!id) {
        throw new Error("Invalid Token!");
      }

      return true;
    } catch (error) {
      return false;
    }
  },
};
