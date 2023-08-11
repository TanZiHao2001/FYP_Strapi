module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/custom/vendorLogin',
            handler: 'vendor.vendorLogin',
            config: {
                auth: false,
            }
        }
    ]
}