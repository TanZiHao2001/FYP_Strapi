const cookie = require("cookie");
const {getVendorIdFromToken, signToken} = require("../../jwt_helper");
const createError = require("http-errors");
const {errorHandler} = require("../../error_helper");
const {sanitize} = require("@strapi/utils");
const {contentAPI} = sanitize;
const bcrypt = require("bcryptjs");
const AuthController = require('./AuthController')

module.exports = {
  async adminLogin(ctx) {
    try {
        const {email, password} = ctx.request.body;
        
        if(!(email === 'admin@admin.com')){
            throw new Error('Wrong credential');
        }
        if(!(password === 'Admin123')){
            throw new Error('Wrong credential');
        }

        const result = 
        fetch('http://127.0.0.1:1337/admin/login', {
            method: 'POST',
                headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ "email": email, "password": password })
        }) 
            .then(response => { 
                if (response.ok) { 
                return response.json(); // Parse the response data as JSON 
                } else { 
                throw new Error('API request failed'); 
                } 
            }) 
            .then(data => { 
                const {token, user} = data.data
                const result = {token, user}
                return result;
                // Process the response data here 
                // return data;  
            }) 
            .catch(error => { 
                // Handle any errors here 
                console.error(error); 
            });
        
        
        return result;
    } catch (error) {
      await errorHandler(ctx, error);
    }
  }
};
