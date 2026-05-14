const https = require('node:https');
const http = require('node:http');
const fs = require('node:fs');

module.exports = (url, dest) => {

  const file = fs.createWriteStream(dest);

  const protocol = (url.indexOf('http:') >= 0) ? http : https;

  return new Promise( (resolve, reject) => {
    protocol.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
      file.on('error', (error) => {
        reject(error);
      });
    });
  });

};
