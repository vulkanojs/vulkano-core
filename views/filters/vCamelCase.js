module.exports = (str) => {

  return String(str || '')
    .split('_')
    .map( (t) => {
      return `${t.charAt(0).toUpperCase()}${t.slice(1).toLowerCase()}`;
    })
    .join('');

};
