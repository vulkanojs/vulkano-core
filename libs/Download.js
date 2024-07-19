const https = require('https');
const http = require('http');
const fs = require('fs');

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
