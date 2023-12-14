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
            fields: ["title", "description", "startDate", "endDate"],
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

        const finalResult = [...tempResult.active, ...tempResult.upcoming, ...tempResult.expired].map(({ id, title, description, startDate, endDate }) => ({
            id,
            title,
            description,
            startDate,
            endDate
        }));
        return finalResult;
      } catch (error) {
        await errorHandler(ctx, error);
      }
    },
    deleteAnnouncement: async (ctx) => {
        try{
            const announcementId = ctx.params.id;
            const entry = await strapi.entityService.delete('api::announcement.announcement', announcementId);
            ctx.send({message: "Announcement Deleted"});
        } catch(error) {
            await errorHandler(ctx, error);
        }
    },
    getAnnouncementEventList: async (ctx) => {
        try{
            // const {year, month} = ctx.request.body
            const announcement = await strapi.entityService.findMany("api::announcement.announcement", {
                fields: ["title", "startDate", "endDate"]
            });
            
            const currentMonthCalendar = getCurrentMonthCalendar(2023, 12);
            const result = create3DArray(currentMonthCalendar);
            console.log(currentMonthCalendar)
            let currMonthDate = []
            for(let i = 0; i < currentMonthCalendar.length; i++) {
                for(let j = 0; j < currentMonthCalendar[i].length; j++) {
                    currMonthDate.push(currentMonthCalendar[i][j].date.getDate())
                }
            }
            console.log(currMonthDate)
            return announcement;
            // return result;
        } catch (error) {
            await errorHandler(ctx, error);
        }
    }
  };

  function getCurrentMonthCalendar(year, month) {
    //year = 2023, month = 12
    let currentMonthCalendar = [];
    const tempMonthCalendar = [];
    const firstDayCurrentMonth = new Date(year, month - 1, 1).getDay() // 5 (friday)
    const lastDayCurrentMonth = new Date(year, month, 0).getDay() // 0 (sunday)
    const lastDateCurrentMonth = new Date(year, month, 0).getDate() // 31 (31/12)
    const lastDateLastMonth = new Date(year, month - 1, 0).getDate() // 30 (30/11)
    for(let i = firstDayCurrentMonth; i > 0; i--) {
        tempMonthCalendar.push({date: new Date(year, month - 2, lastDateLastMonth - i + 1)})
    }
    for(let i = 1; i <= lastDateCurrentMonth; i++){
        tempMonthCalendar.push({date: new Date(year, month - 1, i)})
    }
    for(let i = 1; tempMonthCalendar.length < 42; i++){
        tempMonthCalendar.push({date: new Date(year, month, i)})
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

  function create3DArray(currentMonthCalendar){
    const array = [];
    for(let i = 0; i < 6; i++) {
        array[i] = new Array();
        for(let j = 0; j < 7; j++) {
            array[i][j] = new Array();
        }
    }

    // array[1][0].push({clickResponse: 'Event A', title: 'Event A', isStart: true, color: 'bg-sky-400', level: 0});
    // array[1][0].push({clickResponse: 'Event B', title: 'Event B', isStart: true, isEnd: true, level: 1, color: 'bg-amber-400'});
    
    // array[1][1].push({clickResponse: 'Event A', isEnd: true, color: 'bg-sky-400', level: 0})
    // array[1][1].push({clickResponse: 'Event C', title: 'Event C', isStart: true, color: 'bg-green-400', level: 1})

    // array[1][2].push({clickResponse: 'Event D', title: 'Event D', isStart: true, isEnd: true, color: 'bg-yellow-400', level: 0});
    // array[1][2].push({clickResponse: 'Event C', isEnd: true, color: 'bg-green-400', level: 1});
    // array[1][2].push({clickResponse: 'Event E', title: 'Event E', isStart: true, color: 'bg-rose-400', level: 2});

    // array[1][3].push({clickResponse: 'Event E', isEnd: true, color: 'bg-rose-400', level: 2});
    // array[1][6].push({clickResponse: 'Event F', title: 'Event F', isStart: true, isEnd: true, color: 'bg-emerald-400', level: 0});

    // array[2][0].push({clickResponse: 'Event F', title: 'Event F', isStart: true, isEnd: true, color: 'bg-emerald-400', level: 0});
    return array;
  }
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