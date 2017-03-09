exports.badRequest = (data) => {
  return {
    code: 400,
    msg: 'Bad Request',
    data
  };
};

exports.notFound = (data) => {
  return {
    code: 404,
    msg: 'Unknown Resource',
    data
  };
};

exports.unauthorized = (data) => {
  return {
    code: 401,
    msg: 'Unauthorized',
    data
  };
};

exports.conflict = (data) => {
  return {
    code: 409,
    msg: 'Conflict',
    data
  };
};

exports.internalError = (data) => {
  return {
    code: 500,
    msg: 'Internal server error',
    data
  };
};