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
    },
    {
      method: 'POST',
      path: '/custom/get-announcement-event-list',
      handler: CustomAnnouncement.getAnnouncementEventList,
      config: {
        auth: false
      }
    },
    {
      method: 'POST',
      path: '/custom/create-announcement',
      handler: CustomAnnouncement.createAnnouncement,
      config: {
        auth: false
      }
    },
    {
      method: 'GET',
      path: '/custom/get-announcement-alert',
      handler: CustomAnnouncement.getAnnouncementAlert,
      config: {
        auth: false
      }
    }
  ]
}
