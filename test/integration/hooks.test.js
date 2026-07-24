/**
 * Model lifecycle hooks (database/mongodb.js)
 *
 * database/models.js merges default no-op callbacks into every model:
 * beforeSave, afterSave, beforeUpdate, afterUpdate, beforeFindOneAndUpdate,
 * afterFindOneAndUpdate, beforeRemove, afterRemove, beforeValidate, afterValidate.
 *
 * mongodb.js wires them to Mongoose 8's real operations:
 *   - beforeSave/afterSave           -> "save"       (doc.save())
 *   - beforeUpdate/afterUpdate       -> "updateOne"   (doc.updateOne(), document-only)
 *   - beforeFindOneAndUpdate/after…  -> "findOneAndUpdate" (Model.findOneAndUpdate())
 *   - beforeRemove/afterRemove       -> "deleteOne"   (doc.deleteOne(), document-only)
 *   - beforeValidate/afterValidate   -> "validate" (only fires around doc.validate(),
 *     i.e. during doc.save() — Mongoose's update validators (runValidators option
 *     on updateOne/findOneAndUpdate) validate each changed path directly and never
 *     invoke this middleware chain, confirmed empirically: a failing validator is
 *     still correctly rejected even though beforeValidate/afterValidate never run)
 *
 * Each operation should fire ONLY its own hook pair, with no cross-contamination
 * between them (in particular, no leaking into `beforeUpdate`/`afterUpdate` from
 * findOneAndUpdate, or vice versa). Item
 * (test/fixtures/app/models/Item.js) is the instrumented test model; the
 * ItemController debug routes (hooklog/updateone/deleteone) invoke the raw
 * Mongoose document methods directly so each operation can be verified in
 * isolation, independent of what the scaffold's HTTP CRUD happens to call
 * internally.
 */

const http = require('./helpers/http')(`${process.env.TEST_SERVER_URL}/api/item`);

async function resetHookLog() {
  await http.delete('/hooklog');
}

async function getHookLog() {
  const { data } = await http.get('/hooklog');
  return data.data;
}

describe('Model lifecycle hooks', () => {

  beforeEach(async () => {
    await resetHookLog();
  });

  it('obj.save() fires only beforeValidate, afterValidate, beforeSave, afterSave', async () => {
    const { status } = await http.post('/', { name: 'Hook Save', value: 1 });
    expect(status).toBe(201);

    const log = await getHookLog();
    expect(log).toEqual(['beforeValidate', 'afterValidate', 'beforeSave', 'afterSave']);
  });

  // Note: Mongoose's update validators (the `runValidators` option used here)
  // validate each changed path directly — helpers/updateValidators.js never
  // touches the schema's pre/post('validate') middleware chain. Confirmed
  // empirically: a failing validator (age below its `min`) is correctly
  // rejected, yet beforeValidate/afterValidate never appear in the hook log
  // either way. So beforeValidate/afterValidate genuinely cannot fire around
  // doc.updateOne() — only beforeUpdate/afterUpdate do.
  it('obj.updateOne() fires only beforeUpdate, afterUpdate (validators run but do not trigger beforeValidate/afterValidate)', async () => {
    const created = await http.post('/', { name: 'Hook Update', value: 1 });
    const id = created.data.data._id;
    await resetHookLog();

    const { status } = await http.put(`/updateone/${id}`, { value: 2 });
    expect(status).toBe(200);

    const log = await getHookLog();
    expect(log).toEqual(['beforeUpdate', 'afterUpdate']);
  });

  it('obj.findOneAndUpdate() fires only beforeFindOneAndUpdate, afterFindOneAndUpdate', async () => {
    const created = await http.post('/', { name: 'Hook FOAU', value: 1 });
    const id = created.data.data._id;
    await resetHookLog();

    // Scaffold's PUT /:id updates via Model.update() -> this.findOneAndUpdate()
    const { status } = await http.put(`/${id}`, { value: 3 });
    expect(status).toBe(202);

    const log = await getHookLog();
    expect(log).toEqual(['beforeFindOneAndUpdate', 'afterFindOneAndUpdate']);
  });

  it('a custom per-model update() (get + merge + findOneAndUpdate, matching examples/models/Example.js) fires only beforeFindOneAndUpdate, afterFindOneAndUpdate', async () => {
    const created = await http.post('/', { name: 'Hook Custom Update', value: 1 });
    const id = created.data.data._id;
    await resetHookLog();

    // Item.customUpdate() — same shape as Example.js's update(): getByField()
    // then this.findOneAndUpdate() with the merged record.
    const { status, data } = await http.put(`/customupdate/${id}`, { value: 4 });
    expect(status).toBe(200);
    expect(data.data.value).toBe(4);

    const log = await getHookLog();
    expect(log).toEqual(['beforeFindOneAndUpdate', 'afterFindOneAndUpdate']);
  });

  it('obj.deleteOne() fires only beforeRemove, afterRemove (validate optional, none here)', async () => {
    const created = await http.post('/', { name: 'Hook Delete', value: 1 });
    const id = created.data.data._id;
    await resetHookLog();

    const { status } = await http.delete(`/rawremove/${id}`);
    expect(status).toBe(200);

    const log = await getHookLog();
    expect(log).toEqual(['beforeRemove', 'afterRemove']);
  });

  it('soft-delete via the scaffold (DELETE /:id) still goes through findOneAndUpdate, not beforeRemove/afterRemove', async () => {
    const created = await http.post('/', { name: 'Hook Soft Delete', value: 1 });
    const id = created.data.data._id;
    await resetHookLog();

    const { status } = await http.delete(`/${id}`);
    expect(status).toBe(204);

    const log = await getHookLog();
    expect(log).toEqual(['beforeFindOneAndUpdate', 'afterFindOneAndUpdate']);
  });

});
