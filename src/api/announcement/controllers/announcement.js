"use strict";

/**
 * notification controller
 */

const { createCoreController } = require("@strapi/strapi").factories;
const { sanitize } = require("@strapi/utils");
const { contentAPI } = sanitize;
const createError = require("http-errors");
const { errorHandler } = require("../../error_helper");
const { forEach } = require("../../../../config/middlewares");
const customAnnouncement = require("./CustomAnnouncement");
const { checkAccessVendor, checkAccessAdmin } = require("../../jwt_helper");

module.exports = createCoreController(
  "api::announcement.announcement",
  ({ strapi }) => ({
    async find(ctx) {
      try {
        const vendorId = await checkAccessVendor(ctx)
        if (!vendorId) {
          throw createError.Unauthorized();
        }
        const timeNow = new Date(Date.now()); //+ 8 * 60 * 60 * 1000
        ctx.request.body.month = timeNow.getMonth() + 1;
        ctx.request.body.year = timeNow.getFullYear();
        const announcement = await customAnnouncement.getAnnouncementEventList(ctx);
        const currentCalendarMonth = getCurrentMonthCalendar(ctx.request.body.year, ctx.request.body.month);
        const formattedDates = currentCalendarMonth.map(innerArray =>
          innerArray.map(obj => (new Date(obj.date).toDateString()))
        );
        let rowIndex = formattedDates.findIndex(
          innerArray => innerArray.includes(new Date(timeNow.getFullYear(), timeNow.getMonth(), timeNow.getDate(), 8).toDateString()));
        let columnIndex = formattedDates[rowIndex].indexOf(new Date(timeNow.getFullYear(), timeNow.getMonth(), timeNow.getDate(), 8).toDateString());
        const todayAnnouncement = [];
        for(let i = 0; i < announcement[rowIndex][columnIndex].length; i++) {
          const todayAnnouncementContent = await strapi.entityService.findOne("api::announcement.announcement", announcement[rowIndex][columnIndex][i].clickResponse);
          todayAnnouncement.push(todayAnnouncementContent);
        }

        return todayAnnouncement;
      } catch (error) {
        await errorHandler(ctx, error);
      }
    },
    async findOne(ctx) {
      try {
        if (!(await checkAccessAdmin(ctx))) {
          throw createError.Unauthorized();
        }
        const id = ctx.params.id
        const checkAnnouncementExist = await strapi.entityService.findMany("api::announcement.announcement", {
          filters: {
            id: {
              $eq: id
            }
          }
        });
        const result = await strapi.entityService.findOne("api::announcement.announcement", id, {
          fields: ["title", "description", "announcement_text", "startDate", "endDate", "color"],
          publicationState: "live"
        })
        return result;
      } catch (error) {
        await errorHandler(ctx, error);
      }
    }
  })
);

function getCurrentMonthCalendar(year, month) {
  let currentMonthCalendar = [];
  const tempMonthCalendar = [];
  const firstDayCurrentMonth = new Date(year, month - 1, 1, 8).getDay() // 5 (friday)
  const lastDayCurrentMonth = new Date(year, month, 0, 8).getDay() // 0 (sunday)
  const lastDateCurrentMonth = new Date(year, month, 0, 8).getDate() // 31 (31/12)
  const lastDateLastMonth = new Date(year, month - 1, 0, 8).getDate() // 30 (30/11)
  for(let i = firstDayCurrentMonth; i > 0; i--) {
      tempMonthCalendar.push({date: new Date(year, month - 2, lastDateLastMonth - i + 1, 8)})
  }
  for(let i = 1; i <= lastDateCurrentMonth; i++){
      tempMonthCalendar.push({date: new Date(year, month - 1, i, 8)})
  }
  for(let i = 1; tempMonthCalendar.length < 42; i++){
      tempMonthCalendar.push({date: new Date(year, month, i, 8)})
  }
  currentMonthCalendar = splitCurrentMonthIntoSixWeeks(tempMonthCalendar)
  return currentMonthCalendar
}

function splitCurrentMonthIntoSixWeeks(tempMonthCalendar){
  let currentMonthCalendar = [];
  let j = 1
  for(let i = 0; i < tempMonthCalendar.length; i += 7) {
      currentMonthCalendar.push(tempMonthCalendar.slice(i, 7 * j++))
  }
  return currentMonthCalendar
}