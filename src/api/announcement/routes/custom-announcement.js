'use strict';

const CustomAnnouncement = require('../controllers/CustomAnnouncement')

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/custom/get-announcement-list',
      handler: CustomAnnouncement.getAnnouncementList,
      config: {
        auth: false,
      },
    },
  ]
}
