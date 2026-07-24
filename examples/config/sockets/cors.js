module.exports = (req, callback) => {

  const {
    origin,
    host,
  } = req.headers || {};

  const realOrigin = origin || host;

  const allowedOrigin = [
    'localhost',
    'yourdomain.com'
  ];

  let found = false;

  allowedOrigin.forEach((o) => {

    if ((realOrigin || '').indexOf(o) !== -1) {
      found = true;
    }

  });

  if (found) {
    callback(null, true);
  } else {
    console.log('Invalid origin', realOrigin || 'No Origin');
    callback(new Error(`Invalid origin ${realOrigin} - Socket CORS`));
  }

};
