const { test } = require('node:test');
const assert = require('node:assert');
const { debounce } = require('../public/questions-utils.js');

test('debounce triggers once', async () => {
  let count = 0;
  const d = debounce(() => { count++; }, 50);
  d(); d(); d();
  await new Promise(r => setTimeout(r, 80));
  assert.equal(count, 1);
});
