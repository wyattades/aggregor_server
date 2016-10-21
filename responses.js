exports.badRequest = (data) => {
  return {
    code: 400,
    data: 'Bad request: ' + data
  }
}

exports.unauthorized = (data) => {
  return {
    code: 401,
    data: 'Unauthorized: ' + data
  }
}

exports.internalError = (data) => {
  return {
    code: 500,
    data: 'Internal server error: ' + data
  }
}
