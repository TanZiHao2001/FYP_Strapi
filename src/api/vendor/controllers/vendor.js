'use strict';

/**
 * vendor controller
 */

const {sanitize} = require('@strapi/utils')
const {contentAPI} = sanitize;
const { createCoreController } = require('@strapi/strapi').factories;

// module.exports = createCoreController('api::vendor.vendor', ({strapi}) => ({
//     async vendorLogin(ctx) {
//         try {
//             ctx.body = 'okadsafd';
//         } catch (err) {
//             ctx.body = err;
//         }
//     }
// }));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = createCoreController('api::vendor.vendor', ({ strapi }) => ({
    async vendorLogin(ctx) {
        try{
        const { email, password } = ctx.request.body;
        
        ctx.request.query.filters = {
            email: {
                $eq: email
            }
        }
        
        const contentType = strapi.contentType('api::vendor.vendor')
        const sanitizedQueryParams = await contentAPI.query(ctx.query, contentType)
        const entities = await strapi.entityService.findMany(contentType.uid, sanitizedQueryParams)
        if(entities.length === 0){
            throw new Error('Vendor not found!');
        }
        const isPasswordValid = await bcrypt.compare(password, entities[0].password);
        if (!isPasswordValid) {
            throw new Error('Invalid password');
        }
        const token = jwt.sign({ id: entities[0].id, date: new Date()}, 'your-secret-key', {
            expiresIn: '1d', 
        });
        console.log(token);
        // console.log(parseJwt(token));
        console.log(jwt.decode(token));
        ctx.send({ token, entities });
        console.log(entities[0].password);
        return entities;
        } catch(err) {
            ctx.send({ error: err.message }, 400);
        }
    } 

}));
