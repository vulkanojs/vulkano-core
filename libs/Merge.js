function isMergeableObject(value) {
  return value !== null
    && typeof value === 'object'
    && !(value instanceof RegExp)
    && !(value instanceof Date);
}

function emptyTarget(val) {
  return Array.isArray(val) ? [] : {};
}

function cloneUnlessOtherwiseSpecified(value, options) {
  return (options.clone !== false && options.isMergeableObject(value))
    ? merge(emptyTarget(value), value, options) // eslint-disable-line no-use-before-define
    : value;
}

function defaultArrayMerge(target, source, options) {
  return target.concat(source).map((element) => cloneUnlessOtherwiseSpecified(element, options));
}

function getMergeFunction(key, options) {
  if (!options.customMerge) return merge; // eslint-disable-line no-use-before-define
  const custom = options.customMerge(key);
  return typeof custom === 'function' ? custom : merge; // eslint-disable-line no-use-before-define
}

function getKeys(target) {
  const keys = Object.keys(target);
  if (Object.getOwnPropertySymbols) {
    Object.getOwnPropertySymbols(target).forEach((sym) => {
      if (Object.propertyIsEnumerable.call(target, sym)) {
        keys.push(sym);
      }
    });
  }
  return keys;
}

function propertyIsOnObject(object, property) {
  try {
    return property in object;
  } catch (_) {
    return false;
  }
}

function propertyIsUnsafe(target, key) {
  return propertyIsOnObject(target, key)
    && !(Object.prototype.hasOwnProperty.call(target, key)
      && Object.propertyIsEnumerable.call(target, key));
}

function mergeObject(target, source, options) {

  const destination = {};

  if (options.isMergeableObject(target)) {
    getKeys(target).forEach((key) => {
      destination[key] = cloneUnlessOtherwiseSpecified(target[key], options);
    });
  }

  getKeys(source).forEach((key) => {

    if (propertyIsUnsafe(target, key)) return;

    if (propertyIsOnObject(target, key) && options.isMergeableObject(source[key])) {
      destination[key] = getMergeFunction(key, options)(target[key], source[key], options);
    } else {
      destination[key] = cloneUnlessOtherwiseSpecified(source[key], options);
    }

  });

  return destination;

}

function merge(target, source, options) {

  const opts = options || {};
  opts.arrayMerge = opts.arrayMerge || defaultArrayMerge;
  opts.isMergeableObject = opts.isMergeableObject || isMergeableObject;
  opts.cloneUnlessOtherwiseSpecified = cloneUnlessOtherwiseSpecified;

  const sourceIsArray = Array.isArray(source);
  const targetIsArray = Array.isArray(target);

  if (sourceIsArray !== targetIsArray) {
    return cloneUnlessOtherwiseSpecified(source, opts);
  }

  if (sourceIsArray) {
    return opts.arrayMerge(target, source, opts);
  }

  return mergeObject(target, source, opts);

}

merge.all = function mergeAll(array, options) {
  if (!Array.isArray(array)) {
    throw new Error('first argument should be an array');
  }
  return array.reduce((prev, next) => merge(prev, next, options), {});
};

module.exports = merge;
