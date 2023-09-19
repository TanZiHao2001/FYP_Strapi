'use strict';

/**
 * testapiobject controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const {sanitize} = require('@strapi/utils');
const {contentAPI} = sanitize;

module.exports = createCoreController('api::testapiobject.testapiobject', ({strapi}) => ({

    async find(ctx) {

      ctx.request.query = {
        fields: ["documentation", "documentation2"]
      };

      const contentType = strapi.contentType(
        "api::testapiobject.testapiobject"
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
      
      console.log(JSON.stringify(result[0]["documentation"]))
      console.log(result[0]["documentation"])
      console.log(result[0]["documentation2"])

      ctx.send(result[0]["documentation2"]);
    }
  }));
  