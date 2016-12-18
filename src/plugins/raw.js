const request = require('request'),
      through2 = require('through2'),
      url = require('url');

exports.type = 'raw';

exports.request = function(data) {
  const pt = through2();
  var reqUrl = data.url;

  const protocol = url.parse(reqUrl).protocol;
  if(!protocol)
    reqUrl = 'http://' + reqUrl;

  const req = request(reqUrl);
  req.on('error', (err) => {
    pt.end();
  });
  req.pipe(pt);

  return pt;
};

exports.parse = function() {
  return through2(function(chunk, enc, cb) {
    this.push(chunk.toString());
    cb();
  });
};
