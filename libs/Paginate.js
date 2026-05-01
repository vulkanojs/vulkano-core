// Built once when the module loads: maps each base letter to a character class
// containing all its accented variants. Pre-compiling the RegExp objects avoids
// rebuilding them on every accentToRegex() call.
const _ACCENT_MAP = (() => {

  const from = 'ŠŒŽšœžŸ¥µÀÁÂÃÄÅÆÇÈÉÊËẼÌÍÎÏĨÐÑÒÓÔÕÖØÙÚÛÜÝßàáâãäåæçèéêëẽìíîïĩðñòóôõöøùúûüýÿ'.split('');
  const to = 'SOZsozYYuAAAAAAACEEEEEIIIIIDNOOOOOOUUUUYsaaaaaaaceeeeeiiiiionoooooouuuuyy'.split('');

  const groups = [];

  to.forEach((letter, key) => {
    const exist = groups.indexOf(letter);
    if (exist >= 0) {
      groups[exist] += from[key];
    } else {
      groups.push(letter);
    }
  });

  return groups.map((rg, key) => ({
    charClass: new RegExp(`[${rg}]`),
    placeholder: new RegExp(`_${key}_`),
    expanded: `[${rg}]`,
    key
  }));

})();

module.exports = {

  accentToRegex(_text) {

    let text = _text;

    _ACCENT_MAP.forEach(({ charClass, key }) => {
      text = text.replace(charClass, `_${key}_`);
    });

    _ACCENT_MAP.forEach(({ placeholder, expanded }) => {
      text = text.replace(placeholder, expanded);
    });

    return text;

  },

  serializeQuery(_props, _query) {

    const props = typeof _props === 'object'
      ? _props
      : { sort: null, search: [] };

    const query = _query || {};

    const page = query.page || 1;
    const perPage = Number(query.per_page) || Number(query.perPage) || 30;
    const fields = query.fields || props.fields || [];
    const sort = query.sort || props.sort || null;
    const search = query.search || props.search || null;
    const searchType = (query.searchType || '').toLowerCase().replace('-', '');

    const result = Object.fromEntries(
      Object.entries({
        page, perPage, fields, sort, search
      }).filter(([, v]) => v)
    );

    // Filter by search
    const searchBy = props.searchBy || [];

    const itemsToSearch = [];

    if (search && Array.isArray(searchBy) && searchBy.length > 0 ) {

      searchBy.forEach( (item) => {

        let type = String;

        if (typeof item === 'object') {
          type = item?.type || String;
        }

        const row = {};

        if (type === String) {

          const safeSearch = this.accentToRegex(
            search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
          );

          if (searchType === 'startwith' || searchType === 'start') {
            row[item] = new RegExp(`^${safeSearch}`, 'i');
          } else if (searchType === 'endwith' || searchType === 'end') {
            row[item] = new RegExp(`${safeSearch}$`, 'i');
          } else {
            row[item] = new RegExp(safeSearch, 'i');
          }

        } else if (type === Number) {

          row[item] = search;

        }

        itemsToSearch.push(row);

      });

    }

    if (props.filterByOr) {
      if (Array.isArray(props.filterByOr)) {
        props.filterByOr.forEach( (i) => {
          itemsToSearch.push(i);
        });
      } else {
        itemsToSearch.push(props.filterByOr);
      }
    }

    let newSearch = {};

    const currentFilters = {
      ...(props.filter || {})
    };

    const hasFilters = Object.keys( props.filter || {} ).length > 0 ? true : false;
    const hasItems = itemsToSearch.length > 0 ? true : false;

    if (hasItems && hasFilters) {

      newSearch.$and = [];

      // AND
      newSearch.$and.push(currentFilters);

      // OR
      newSearch.$and.push({ $or: itemsToSearch });

    } else if (hasItems && !hasFilters) {

      newSearch.$or = itemsToSearch;

    } else if (!hasItems && hasFilters) {

      newSearch = { ...currentFilters };

    }

    return {
      ...result,
      search: newSearch
    };

  },

  getPopulatedCollections(populate) {

    const optPopulate = [];

    if (populate.length > 0) {

      populate.forEach( (item) => {

        const {
          virtual,
          collection,
          path,
          model
        } = item;

        let populateProps = null;

        if (virtual) {
          populateProps = virtual;
        } else {

          populateProps = {
            path: collection || path || model
          };

          if (item.fields) {
            populateProps.select = item.fields;
          } else if (item.select) {
            populateProps.select = item.select;
          }

          if (item.match) {
            populateProps.match = item.match;
          }

          if (item.populate) {
            populateProps.populate = item.populate;
          }

        }

        optPopulate.push(populateProps);

      });

    }

    return optPopulate;

  },

  // Convert records to paginate
  get(Model, query, hasPopulate) {

    const populate = hasPopulate || [];

    const criteria = query || {};

    // Setup
    const page = criteria.page === 'all' ? 'all' : ( parseInt(criteria.page, 10) || 1);
    const perPage = +criteria.per_page || +criteria.perPage || 50;

    delete criteria.page;
    delete criteria.per_page;
    delete criteria.perPage; // Fallback

    const fields = [];
    if (Array.isArray(criteria.fields)) {
      criteria.fields.forEach( (f) => {
        fields.push(f);
      });
    } else if (typeof criteria.fields === 'string') {
      const tmpFields = (criteria.fields) ? criteria.fields.split(',') : [];
      tmpFields.forEach( (f) => {
        fields.push(f);
      });
    }
    delete criteria.fields;

    const tmpSort = (criteria.sort || '').split(',');
    const sort = { sort: {} };
    tmpSort.forEach( (_part) => {
      const part = (_part || '').split('|');
      if (part.length > 1) {
        const desc = part[1].trim().toLowerCase() === 'descending' ? 'desc' : '';
        const asc = part[1].trim().toLowerCase() === 'ascending' ? 'asc' : '';
        sort.sort[part[0].trim()] = asc || desc || part[1].trim().toLowerCase();
      }
    });

    delete criteria.sort;

    if (criteria.search) {
      Object.assign(criteria, criteria.search);
      delete criteria.search;
    }

    const optPopulate = this.getPopulatedCollections(populate || []);
    const queryModel = { ...criteria };

    if (page === 'all') {

      const optsModel = { ...sort, populate: optPopulate };
      return Model.find(queryModel, fields.join(' '), optsModel);

    }

    return Model
      .countDocuments(criteria)
      .then( (total) => {

        const opts = {
          page,
          limit: perPage
        };

        if (fields.length > 0) {
          opts.select = fields.join(' ');
        }

        opts.populate = optPopulate;

        const optsModel = { ...opts, ...sort };

        return Model
          .paginate(queryModel, optsModel)
          .then( (data) => this._set(total, data.docs, page, perPage) );

      });

  },

  _set(total, items, _page, _perPage) {

    const page = _page || 1;
    const perPage = _perPage || 30;

    let cursor = (page > 1) ? ((page * perPage) - (perPage - 1)) : 1;

    const tmpNext = (((perPage * (page - 1)) + perPage) < total);
    const next = tmpNext ? (page + 1) : false;
    let prev = (page > 1) ? (page - 1) : false;
    const totalPages = Math.ceil(total / perPage);

    if ( (totalPages < page) && (total > 0) ) {
      prev = false;
    }

    cursor = (total >= cursor) ? cursor : 1;

    return {
      items,
      cursor,
      page,
      perPage,
      next,
      prev,
      totalPages,
      totalItems: total
    };

  }

};
