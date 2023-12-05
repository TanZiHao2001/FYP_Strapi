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
    {
      method: 'DELETE',
      path: '/custom/delete-announcement/:id',
      handler: CustomAnnouncement.deleteAnnouncement,
      config: {
        auth: false,
      }

    }
  ]
}
