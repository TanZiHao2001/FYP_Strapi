'use strict';
const express = require('express')
require('dotenv').config()

const cors = require('cors');
const cookies = require("cookie-parser");

const app = express()
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookies());

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://192.168.102.118:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
};
app.use(cors(corsOptions));
module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {
    // // Override the default upload info formatter with custom function.
    // strapi.services["plugin::upload.upload"].formatFileInfo =
    //   require("./extensions/upload/overrides").formatFileInfoOverride;
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap(/*{ strapi }*/) {},
};
