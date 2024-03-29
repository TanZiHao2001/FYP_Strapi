const { sanitize } = require("@strapi/utils");
const { contentAPI } = sanitize;
// const cookie = require("cookie");
const { checkAccessAdmin, checkAccessVendor } = require("../../jwt_helper");
const createError = require("http-errors");
const { errorHandler } = require("../../error_helper");
const { filter } = require("../../../../config/middlewares");

module.exports = {
    getAnnouncementList: async (ctx) => {
      try {
        if (!(await checkAccessAdmin(ctx))) {
            throw createError.Unauthorized();
        }
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
            if (!(await checkAccessAdmin(ctx))) {
                throw createError.Unauthorized();
            }
            const announcementId = ctx.params.id;
            const checkAnnouncementExist = await strapi.entityService.findMany("api::announcement.announcement", {
                filters: {
                    id: {
                        $eq: announcementId
                    }
                }
            });
            if (checkAnnouncementExist.length === 0) {
                throw createError.NotFound();
            }
            const entry = await strapi.entityService.delete('api::announcement.announcement', announcementId);
            ctx.send({message: "Announcement Deleted"});
        } catch(error) {
            await errorHandler(ctx, error);
        }
    },
    getAnnouncementEventList: async (ctx) => {
        //this function may need to be remodified if want to handle announcement time as well
        try{
            if (!(await checkAccessAdmin(ctx) || await checkAccessVendor(ctx))) {
                throw createError.Unauthorized();
            }
            const {year, month} = ctx.request.body
            let announcement = await strapi.entityService.findMany("api::announcement.announcement", {
                fields: ["title", "startDate", "endDate", "color"]
            });
            const currentMonthCalendar = getCurrentMonthCalendar(year, month);
            const result = create3DArray();
            let currMonthDate = []
            for(let i = 0; i < currentMonthCalendar.length; i++) {
                for(let j = 0; j < currentMonthCalendar[i].length; j++) {
                    currMonthDate.push(currentMonthCalendar[i][j].date)
                }
            }

            filterAnnouncementByCurrentMonthYear(announcement, currMonthDate);
            let filteredAnnouncement = announcement.filter(item => item !== null);
            filteredAnnouncement.sort((a, b) => {
                // @ts-ignore
                return new Date(a.startDate) - new Date(b.startDate) || new Date(a.endDate) - new Date(b.endDate);
            })
            const formattedDates = currentMonthCalendar.map(innerArray =>
                innerArray.map(obj => (new Date(obj.date).toDateString()))
              );
            loop1: for(let i = 0; i < 3; i++) { // level 0, 1, 2
                for(let j = 0; j < filteredAnnouncement.length; j++) { // index for announcement
                    if(new Date(filteredAnnouncement[j].startDate).getTime() < new Date(currMonthDate[0]).getTime()) {
                        filteredAnnouncement[j].startDate = new Date(currMonthDate[0]);
                    }
                    const startYear = new Date(filteredAnnouncement[j].startDate).getFullYear();
                    const startMonth = new Date(filteredAnnouncement[j].startDate).getMonth();
                    const startDate = new Date(filteredAnnouncement[j].startDate).getDate();
                    const endYear = new Date(filteredAnnouncement[j].endDate).getFullYear();
                    const endMonth = new Date(filteredAnnouncement[j].endDate).getMonth();
                    const endDate = new Date(filteredAnnouncement[j].endDate).getDate();
                    loop3: for(let k = 0; k < currMonthDate.length; k++) {
                        // check if the startDate for current announcement is already earlier than the current checking date
                        if(new Date(filteredAnnouncement[j].startDate).getTime() < new Date(currMonthDate[k]).getTime()) break loop3;
                        // check if startDate for current announcement matches the current checking date 
                        if(startYear === new Date(currMonthDate[k]).getFullYear() && startMonth === new Date(currMonthDate[k]).getMonth() && startDate === new Date(currMonthDate[k]).getDate()) {
                            let rowIndex = formattedDates.findIndex(
                                innerArray => innerArray.includes(new Date(startYear, startMonth, startDate).toDateString()));
                            let columnIndex = formattedDates[rowIndex].indexOf(new Date(startYear, startMonth, startDate).toDateString());
                            const tempLevel = [false, false, false];
                            const tempResult = result[rowIndex][columnIndex]
                            for(let x = 0; x < tempResult.length; x++) {
                                tempLevel[x] = true;
                            }
                            //check if startDate and endDate of the current announcement is same
                            if(startYear === endYear && startMonth === endMonth && startDate === endDate){
                                if(tempLevel[i]) break loop3;
                                result[rowIndex][columnIndex++].push(
                                    {
                                        clickResponse: filteredAnnouncement[j].id,
                                        title: filteredAnnouncement[j].title,
                                        isStart: true,
                                        isEnd: true,
                                        color: filteredAnnouncement[j].color,
                                        level: i
                                    }
                                );
                                filteredAnnouncement = filteredAnnouncement.filter(item => (item !== filteredAnnouncement[j]));
                                j--;
                                break loop3;
                            } 
                            //startDate and endDate of current announcement are not same, means more than 1 day
                            else {
                                if(tempLevel[i]) break loop3;
                                //push first day, isStart = true, isEnd = false
                                result[rowIndex][columnIndex++].push(
                                    {
                                        clickResponse: filteredAnnouncement[j].id,
                                        title: filteredAnnouncement[j].title,
                                        isStart: true,
                                        isEnd: false,
                                        color: filteredAnnouncement[j].color,
                                        level: i
                                    }
                                );
                                // @ts-ignore
                                //calculate the number of days
                                let diffDay = Math.ceil((new Date(filteredAnnouncement[j].endDate) - new Date(filteredAnnouncement[j].startDate))
                                                / (24 * 60 * 60 * 1000));
                                //handle rare case for diffDay === 1 and involves different weeks
                                if(diffDay === 1 && columnIndex === 7) {
                                    result[rowIndex][--columnIndex][result[rowIndex][columnIndex].length-1].isEnd = true;
                                    columnIndex = 0;
                                    if(rowIndex === 5) break loop3
                                    result[++rowIndex][columnIndex++].push(
                                        {
                                            clickResponse: filteredAnnouncement[j].id,
                                            title: filteredAnnouncement[j].title,
                                            isStart: true,
                                            isEnd: true,
                                            color: filteredAnnouncement[j].color,
                                            level: i
                                        }
                                    )
                                    filteredAnnouncement = filteredAnnouncement.filter(item => (item !== filteredAnnouncement[j]));
                                    j--;
                                    break loop3;
                                }
                                //check if columnIndex out of bounds (already reach end of week) and 
                                //check if haven't reach endDate of annoucement
                                if(columnIndex > 6 && diffDay > 1){
                                    result[rowIndex][--columnIndex][result[rowIndex][columnIndex].length - 1].isEnd = true;
                                    columnIndex = 0;
                                    if(rowIndex + 1 > 5) {
                                        filteredAnnouncement = filteredAnnouncement.filter(item => (item !== filteredAnnouncement[j]));
                                        j--;
                                        break loop3;
                                    }
                                    result[++rowIndex][columnIndex++].push(
                                        {
                                            clickResponse: filteredAnnouncement[j].id,
                                            title: filteredAnnouncement[j].title,
                                            isStart: true,
                                            isEnd: false,
                                            color: filteredAnnouncement[j].color,
                                            level: i
                                        }
                                    );
                                    diffDay--;
                                }
                                else if(columnIndex > 6) {
                                    ++rowIndex;
                                    columnIndex = 0;
                                }

                                if(rowIndex > 5) {
                                    break loop3;
                                }
                                while(diffDay > 1) {
                                    result[rowIndex][columnIndex++].push(
                                        {
                                            clickResponse: filteredAnnouncement[j].id,
                                            isStart: false,
                                            isEnd: false,
                                            color: filteredAnnouncement[j].color,
                                            level: i
                                        }
                                    );
                                    if(columnIndex > 6 && diffDay > 1){
                                        result[rowIndex][--columnIndex][result[rowIndex][columnIndex].length - 1].isEnd = true;
                                        columnIndex = 0;
                                        if(rowIndex + 1 > 5) {
                                            filteredAnnouncement = filteredAnnouncement.filter(item => (item !== filteredAnnouncement[j]));
                                            j--;
                                            break loop3;
                                        }
                                        result[++rowIndex][columnIndex++].push(
                                            {
                                                clickResponse: filteredAnnouncement[j].id,
                                                title: filteredAnnouncement[j].title,
                                                isStart: true,
                                                isEnd: false,
                                                color: filteredAnnouncement[j].color,
                                                level: i
                                            }
                                        );
                                        diffDay--;
                                        if(diffDay === 1) {
                                            result[rowIndex][columnIndex-1][result[rowIndex][columnIndex-1].length-1].isEnd = true;
                                            const checkLength = filteredAnnouncement.length;
                                            filteredAnnouncement = filteredAnnouncement.filter(item => (item !== filteredAnnouncement[j]));
                                            if(filteredAnnouncement.length !== checkLength) j--;
                                            break loop3;
                                        }
                                    }
                                    else if(columnIndex > 6) {
                                        ++rowIndex;
                                        columnIndex = 0;
                                    }

                                    if(rowIndex > 5) {
                                        j--
                                        break loop3;
                                    }
                                    diffDay--;
                                }
                                result[rowIndex][columnIndex++].push(
                                    {
                                        clickResponse: filteredAnnouncement[j].id,
                                        isStart: false,
                                        isEnd: true,
                                        color: filteredAnnouncement[j].color,
                                        level: i
                                    }
                                );
                                const checkLength = filteredAnnouncement.length;
                                filteredAnnouncement = filteredAnnouncement.filter(item => (item !== filteredAnnouncement[j]));
                                if(filteredAnnouncement.length !== checkLength) j--;
                                break loop3;
                            }
                        }
                    }
                }
            }
            return result;
        } catch (error) {
            await errorHandler(ctx, error);
        }
    },
    createAnnouncement: async (ctx) => {
        try {
            if (!(await checkAccessAdmin(ctx))) {
                throw createError.Unauthorized();
            }
            const {title, description, announcement_text, startDate, endDate, color} = ctx.request.body;
            let id;
            if(ctx.request.body.id) {
                id = ctx.request.body.id; 
            }
            
            if(id) { 
                const findExist = await strapi.entityService.findOne("api::announcement.announcement", id);
                if(!findExist) {
                    return ctx.send({error: "Announcement not found!"});
                }

                const checkTitleName = await strapi.entityService.findMany("api::announcement.announcement", {
                    filters: {
                        title: {
                            $eq: title
                        }
                    }
                })
                
                if(checkTitleName.length > 0 && checkTitleName[0].title !== findExist.title) {
                    return ctx.send({error: `Announcement title ${title} already exist!`});
                }

                const updateEntry = await strapi.entityService.update("api::announcement.announcement", id, {
                    data: {
                        title: title,
                        description: description,
                        announcement_text: announcement_text,
                        startDate: startDate,
                        endDate: endDate,
                        color: color,
                    }
                });
                return ctx.send({message: `Announcement ${updateEntry.title} has been updated`});
            }

            const checkTitle = await strapi.entityService.findMany("api::announcement.announcement", {
                filters: {
                    title: {
                        $eq: title
                    }
                }
            });
            if(checkTitle.length > 0) {
                return ctx.send({error: `Announcement title ${title} already exist!`})
            }

            const entry = await strapi.entityService.create("api::announcement.announcement", {
                data: {
                    title: title,
                    description: description,
                    announcement_text: announcement_text,
                    startDate: startDate,
                    endDate: endDate,
                    color: color,
                    publishedAt: Date.now()
                }
            });
            return ctx.send({message: `Announcement ${entry.title} has been created`});
        } catch (error) {
            await errorHandler(ctx, error);
        }
        
    },
    getAnnouncementAlert: async (ctx) => {
        try {
            if (!(await checkAccessAdmin(ctx))) {
                throw createError.Unauthorized();
            }
            ctx.request.query = {
                fields: ["title", "description", "startDate", "endDate", "color"],
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
    
            const finalResult = [...tempResult.upcoming].map(({ id, title, description, startDate, endDate, color }) => ({
                id,
                title,
                description,
                startDate,
                endDate,
                color
            }));

            return finalResult.slice(0, 5);
        } catch (error) {
            await errorHandler(ctx, error)
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

  function create3DArray(){
    const array = [];
    for(let i = 0; i < 6; i++) {
        array[i] = new Array();
        for(let j = 0; j < 7; j++) {
            array[i][j] = new Array();
        }
    }
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

  function filterAnnouncementByCurrentMonthYear(announcement, currentMonthCalendar) {
    for(let i = 0; i < announcement.length; i++) {
        if(currentMonthCalendar.some(date => {
            return date.getTime() <= new Date(announcement[i].endDate).getTime() 
            && date.getTime() >= new Date(announcement[i].startDate).getTime()
        })) continue;
        if(new Date(announcement[i].startDate) < new Date(currentMonthCalendar[0]) ||
        new Date(announcement[i].startDate) > new Date(currentMonthCalendar[currentMonthCalendar.length - 1])) {
            delete announcement[i];
        }
    }
    return announcement;
  }

