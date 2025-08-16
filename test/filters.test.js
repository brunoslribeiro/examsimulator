const test = require('node:test');
const assert = require('assert');
const { filterQuestions } = require('../public/questions-utils.js');

const sample = [
  { _id:'1', text:'Alpha question', type:'single', status:'draft', imagePath:'', topic:'math', updatedAt:'2024-01-01' },
  { _id:'2', text:'Beta question', type:'multiple', status:'published', imagePath:'/img.png', topic:'science', updatedAt:'2024-01-05' }
];

test('filter by type', () => {
  const res = filterQuestions(sample, { type:'single' });
  assert.strictEqual(res.length, 1);
  assert.strictEqual(res[0]._id, '1');
});

test('filter by hasImage', () => {
  const res = filterQuestions(sample, { hasImage:'yes' });
  assert.strictEqual(res.length, 1);
  assert.strictEqual(res[0]._id, '2');
});

test('search term', () => {
  const res = filterQuestions(sample, { search:'beta' });
  assert.strictEqual(res.length, 1);
  assert.strictEqual(res[0]._id, '2');
});
