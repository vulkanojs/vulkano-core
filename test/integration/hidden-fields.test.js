/**
 * Request field selection never exposes a `select: false` path
 * (database/scaffold.js _sanitizeFields — applied by Paginate.get and _buildPopulate).
 *
 * Setup: resets example + school collections, creates one School with a
 * hidden `pin` and one Example referencing it.
 */

const testHttp = require('./helpers/http')(process.env.TEST_SERVER_URL);
const school = require('./helpers/http')(`${process.env.TEST_SERVER_URL}/api/school`);
const example = require('./helpers/http')(`${process.env.TEST_SERVER_URL}/api/example`);

const PIN = 'HIDDEN-PIN-1234';

let exampleId;

beforeAll(async () => {

  await testHttp.delete('/test/resetexamples');

  const { data: schoolData } = await school.post('/', { name: 'Vulkano High', pin: PIN });
  const schoolId = schoolData.data._id;

  const { data: exampleData } = await example.post('/', { name: 'Ada', school: schoolId });
  exampleId = exampleData.data._id;

}, 30000);

describe('GET /api/school — ?fields=', () => {

  it.each([
    ['password-style explicit name', 'pin'],
    ['+ override', '+pin'],
    ['mixed with a visible field', 'name,+pin']
  ])('%s (?fields=%s) never returns pin', async (_label, fields) => {
    const { status, data } = await school.get(`/?fields=${encodeURIComponent(fields)}`);
    expect(status).toBe(200);
    expect(data.data.items.length).toBeGreaterThan(0);
    data.data.items.forEach((item) => expect(item.pin).toBeUndefined());
    expect(JSON.stringify(data)).not.toContain(PIN);
  });

  it('page=all path is sanitized too', async () => {
    const { status, data } = await school.get('/?page=all&fields=%2Bpin');
    expect(status).toBe(200);
    expect(JSON.stringify(data)).not.toContain(PIN);
  });

  it('visible fields still work', async () => {
    const { data } = await school.get('/?fields=name');
    expect(data.data.items[0].name).toBe('Vulkano High');
  });

});

describe('GET /api/example — ?populate=school:<fields>', () => {

  it.each(['pin', '+pin', 'name|+pin'])('school:%s never returns pin', async (fields) => {
    const list = await example.get(`/?populate=${encodeURIComponent(`school:${fields}`)}`);
    expect(list.status).toBe(200);
    expect(JSON.stringify(list.data)).not.toContain(PIN);

    const one = await example.get(`/${exampleId}?populate=${encodeURIComponent(`school:${fields}`)}`);
    expect(one.status).toBe(200);
    expect(JSON.stringify(one.data)).not.toContain(PIN);
  });

  it('visible populate fields still work', async () => {
    const { data } = await example.get(`/${exampleId}?populate=school:name`);
    expect(data.data.school.name).toBe('Vulkano High');
  });

});
