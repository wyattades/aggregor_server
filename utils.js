exports.aggregateStream = function(stream) {
  return new Promise( (resolve, reject) => {
    let data = Buffer.from([]);
    stream.on('data', (chunk) => { data = Buffer.concat([data, chunk]); });
    stream.on('end', () => {
      resolve(data);
    });
    stream.on('error', (err) => {
      reject(err);
    });
  });
};
