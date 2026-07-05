const sendSuccess = (res, data, status = 200) => {
  res.status(status).json({ success: true, data });
};

const sendCreated = (res, data) => {
  sendSuccess(res, data, 201);
};

const sendError = (res, message, status = 500) => {
  res.status(status).json({ success: false, error: message });
};

module.exports = { sendSuccess, sendCreated, sendError };
