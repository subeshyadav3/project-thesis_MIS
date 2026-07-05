const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err.message);
  sendError(res, 'Internal server error');
};

module.exports = errorHandler;
