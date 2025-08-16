const test = require('node:test');
const assert = require('assert');
const { dryRunReplace } = require('../public/questions-utils.js');

const sample = [
  { _id:'1', text:'foo bar', updatedAt:'2024-01-01' },
  { _id:'2', text:'foo baz foo', updatedAt:'2024-01-02' }
];

test('dryRunReplace counts and previews', () => {
  const res = dryRunReplace(sample, 'foo', 'qux');
  assert.strictEqual(res.count, 2);
  assert.strictEqual(res.questions[0].after, 'qux bar');
});
