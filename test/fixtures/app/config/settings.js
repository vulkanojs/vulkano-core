module.exports = {
  port: parseInt(process.env.TEST_PORT, 10) || 9877,
  database: {
    connection: 'MONGO_URI'
  }
};
