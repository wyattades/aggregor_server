const request = require('request'),
      through2 = require('through2');

exports.type = 'raw';

exports.request = function(data) {
  const pt = through2(),
        url = data.url;

  const req = request(url);
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
