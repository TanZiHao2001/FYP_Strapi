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
  origin: 'http://localhost:4200',
  credentials: true,
};
app.use(cors(corsOptions));
module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap(/*{ strapi }*/) {},
};
