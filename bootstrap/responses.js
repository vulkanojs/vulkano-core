const path = require('path');

// Include all user's responses
const VulkanoResponses = require('include-all')({
  dirname: path.join(CORE_PATH, '/responses'),
  optional: true,
  filter: /(.+)\.js$/
});

const CustomResponses = require('include-all')({
  dirname: path.join(APP_PATH, '/responses'),
  optional: true,
  filter: /(.+)\.js$/
});

module.exports = function loadResponsesApplication(req, res, next) {

  // add custom user reponses
  Object.keys(VulkanoResponses || {}).forEach((response) => {
    const reponseName = response.split('.')[0];
    res[reponseName] = VulkanoResponses[response];
  });

  // add custom user reponses
  Object.keys(CustomResponses || {}).forEach((response) => {
    const reponseName = response.split('.')[0];
    res[reponseName] = CustomResponses[response];
  });

  next();

};
