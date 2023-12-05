const { sanitize } = require("@strapi/utils");
const { contentAPI } = sanitize;
// const cookie = require("cookie");
// const { getVendorIdFromToken } = require("../../jwt_helper");
const createError = require("http-errors");
const { errorHandler } = require("../../error_helper");

module.exports = {
    getAnnouncementList: async (ctx) => {
      try {
        ctx.request.query = {
            fields: ["title", "startDate", "endDate"],
            publicationState: 'live',
        };
  
        const contentType = strapi.contentType(
            "api::announcement.announcement"
        );
  
        const sanitizedQueryParams = await contentAPI.query(
            ctx.query,
            contentType
        );

        const entities = await strapi.entityService.findMany(
            contentType.uid,
            sanitizedQueryParams
        );

        const result = await contentAPI.output(entities, contentType);
          
        const tempResult = groupByDate(result);
        
        tempResult.active.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
        tempResult.upcoming.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        tempResult.expired.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

        const finalResult = [...tempResult.active, ...tempResult.upcoming, ...tempResult.expired].map(({ id, title, startDate, endDate }) => ({
            id,
            title,
            startDate,
            endDate
        }));
        return finalResult;
      } catch (error) {
        errorHandler(ctx, error)
      }
    }
  };

  function groupByDate(arr){
    const currentTime = new Date();
    let result = {
        active: [],
        upcoming: [],
        expired: []
    };

    arr.forEach(item => {
        if(currentTime - new Date(item.startDate) >= 0 && new Date(item.endDate) - currentTime >= 0){
            result.active.push(item);
        } else if(currentTime - new Date(item.startDate) < 0) {
            result.upcoming.push(item);
        } else if(currentTime - new Date(item.startDate) >= 0 && new Date(item.endDate) - currentTime <= 0){
            result.expired.push(item);
        }
    })

    return result;
  }