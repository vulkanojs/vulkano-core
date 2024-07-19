module.exports = (str) => {

  return String(str || '')
    .split(' ')
    .join('_')
    .toLowerCase();

};
