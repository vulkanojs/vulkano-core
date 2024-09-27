/**
 * Filter ltrim
 *
 * Filter.get('custom string', 'ltrim', 'cus');
 * return 'tom string'
 *
 */
module.exports = {

  exec: (_str, opt) => {
    const str = Filter.get( String(_str).trim(), ['rtrim', 'ltrim'], opt);
    return str;
  }

};
