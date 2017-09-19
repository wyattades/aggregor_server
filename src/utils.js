exports.MACROS = {
  username: '[\\w]{4,32}',
  feed_name: '[\\w]{1,32}',
  plugin_id: '[a-z0-9-]{36}',
  page: '[0-9]+',
  password: '(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d$@$!%*#?&]{8,64}',
  name: '[\\w-\']{1,32}',
  type: '[\\w]{1,64}',
};

exports.regexRoute = (rt) => {

  let re = `^${rt}/?$`
    .replace(/:(\w+)/g, (m, name) => exports.MACROS[name] ? `(${exports.MACROS[name]})` : m);

  return new RegExp(re);
};

exports.aggregateStream = (stream) => {
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

exports.parse = (string) => {
  return new Promise((resolve, reject) => {
    try {
      const data = JSON.parse(string);
      resolve(data);
    } catch(e) {
      reject();
    }
  });
};

/*
const requiredInfo = {
  'email': /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
  'username': /^(?![_-])(?!.*[_-]{2})[a-zA-Z0-9_-]{3,31}[a-zA-Z0-9]$/,
  'password': /(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d$@$!%*#?&]{8,64}$/,
};
*/

exports.updateMultiple = ({ client, table, valueName, values, valueType }) => {

  if (values.length === 0) {
    return Promise.resolve();
  }

  const valueMap = values.map((v, i) => `('${v.id}'::uuid, $${i + 1}::${valueType})`).join(', ');
  
  const query = `
    UPDATE ${table} SET
      ${valueName} = c.${valueName}
    FROM (VALUES
      ${valueMap}
    ) AS c(id, ${valueName})
    WHERE c.id = ${table}.id
  `;
  
  return client.query(
    query, 
    values.map(v => v[valueName])
  );
};