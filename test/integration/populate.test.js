/**
 * Scaffold — auto-populate of ref fields (database/scaffold.js _buildPopulate)
 *
 * Setup: resets example + school collections, creates one School and one
 * Example referencing it.
 */

const testHttp = require('./helpers/http')(process.env.TEST_SERVER_URL);
const school = require('./helpers/http')(`${process.env.TEST_SERVER_URL}/api/school`);
const example = require('./helpers/http')(`${process.env.TEST_SERVER_URL}/api/example`);

let schoolId;
let exampleId;

beforeAll(async () => {

  await testHttp.delete('/test/resetexamples');

  const { data: schoolData } = await school.post('/', { name: 'Vulkano High', address: '123 Main St' });
  schoolId = schoolData.data._id;

  const { data: exampleData } = await example.post('/', {
    name: 'Ada',
    age: 30,
    school: schoolId,
    secret: schoolId
  });
  exampleId = exampleData.data._id;

}, 30000);

describe('GET /api/example/:id — populate=school', () => {

  it('without populate: school is just the raw id', async () => {
    const { status, data } = await example.get(`/${exampleId}`);
    expect(status).toBe(200);
    expect(data.data.name).toBe('Ada');
    expect(data.data.age).toBe(30);
    expect(data.data.school).toBe(schoolId);
  });

  it('with populate=school: school is the populated object', async () => {
    const { status, data } = await example.get(`/${exampleId}?populate=school`);
    expect(status).toBe(200);
    expect(data.data.school).toEqual(
      expect.objectContaining({ _id: schoolId, name: 'Vulkano High' })
    );
  });

  it('populate is case/space insensitive ("  School ")', async () => {
    const { data } = await example.get(`/${exampleId}?populate=${encodeURIComponent('  School ')}`);
    expect(data.data.school).toEqual(
      expect.objectContaining({ _id: schoolId })
    );
  });

  it('unknown populate value is ignored, no crash', async () => {
    const { status, data } = await example.get(`/${exampleId}?populate=doesnotexist`);
    expect(status).toBe(200);
    expect(data.data.school).toBe(schoolId);
  });

  it('a real ref field NOT on the model allowlist ("secret") is refused', async () => {
    const { status, data } = await example.get(`/${exampleId}?populate=secret`);
    expect(status).toBe(200);
    // "secret" IS a real relation (same ref as "school") — if the allowlist
    // didn't apply, this would come back as an expanded { _id, name } object
    expect(data.data.secret).toBe(schoolId);
  });

  it('populate=school:name narrows the populated doc to just name (+_id)', async () => {
    const { status, data } = await example.get(`/${exampleId}?populate=${encodeURIComponent('school:name')}`);
    expect(status).toBe(200);
    expect(data.data.school).toEqual(
      expect.objectContaining({ _id: schoolId, name: 'Vulkano High' })
    );
    expect(data.data.school.active).toBeUndefined();
    expect(data.data.school.createdAt).toBeUndefined();
  });

  it('without a colon, the populated doc keeps every field', async () => {
    const { data } = await example.get(`/${exampleId}?populate=school`);
    expect(Object.keys(data.data.school)).toEqual(
      expect.arrayContaining(['_id', 'name', 'active', 'createdAt'])
    );
  });

  it('populate=school:address narrows the populated doc to just address (+_id)', async () => {
    const { status, data } = await example.get(`/${exampleId}?populate=${encodeURIComponent('school:address')}`);
    expect(status).toBe(200);
    expect(data.data.school).toEqual(
      expect.objectContaining({ _id: schoolId, address: '123 Main St' })
    );
    expect(data.data.school.name).toBeUndefined();
    expect(data.data.school.active).toBeUndefined();
  });

  it('populate=school:name|address selects both fields', async () => {
    const { data } = await example.get(`/${exampleId}?populate=${encodeURIComponent('school:name|address')}`);
    expect(data.data.school).toEqual(
      expect.objectContaining({ _id: schoolId, name: 'Vulkano High', address: '123 Main St' })
    );
    expect(data.data.school.active).toBeUndefined();
  });

  it('a stray ?school=... query param is NOT treated as a field selector (it would collide with a real filter)', async () => {
    const { data } = await example.get(`/${exampleId}?populate=school&school=address`);
    // full doc still comes back — "school" as a top-level query param is ignored by populate
    expect(data.data.school).toEqual(
      expect.objectContaining({ _id: schoolId, name: 'Vulkano High', address: '123 Main St' })
    );
  });

});

describe('GET /api/example/ — list with populate=school', () => {

  it('returns name, school (populated object) and age', async () => {
    const { status, data } = await example.get('/?populate=school');
    expect(status).toBe(200);
    const item = data.data.items.find((i) => i._id === exampleId);
    expect(item.name).toBe('Ada');
    expect(item.age).toBe(30);
    expect(item.school).toEqual(
      expect.objectContaining({ _id: schoolId, name: 'Vulkano High' })
    );
  });

  it('without populate: school stays the raw id in the list', async () => {
    const { data } = await example.get('/');
    const item = data.data.items.find((i) => i._id === exampleId);
    expect(item.school).toBe(schoolId);
  });

});
