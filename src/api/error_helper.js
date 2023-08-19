module.exports = {
  errorHandler: (ctx, error) => {
    return new Promise((resolve, reject) => {
      if (error.status === 500) {
        ctx.response.status = error.status;
        ctx.response.body = {error: "Internal Server Error"};
        resolve(ctx);
      } else {
        ctx.response.status = error.status || 500;
        ctx.response.body = {error: error.message || "Internal Server Error"};
        resolve(ctx);
      }
    })
  }
}
