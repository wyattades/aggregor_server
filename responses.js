exports.badRequest = (data) => {
  return {
    code: 401,
    data
  }
}

exports.internalError = (data) => {
  return {
    code: 500,
    data
  }
}
