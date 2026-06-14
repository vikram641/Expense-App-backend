const sendSuccess = (res, data, statusCode = 200) =>
  res.status(statusCode).json({ success: true, data });

const sendError = (res, code, message, statusCode = 400, field = null) => {
  const error = { code, message };
  if (field) error.field = field;
  return res.status(statusCode).json({ success: false, error });
};

module.exports = { sendSuccess, sendError };
