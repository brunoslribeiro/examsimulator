const test = require('node:test');
const assert = require('assert');
const { validateQuestion } = require('../public/questions-utils.js');

test('validation fails without correct option', () => {
  const res = validateQuestion({ text:'Q?', type:'single', options:[{ text:'A', isCorrect:false },{ text:'B', isCorrect:false }] });
  assert.strictEqual(res.ok, false);
  assert.ok(res.errors.includes('singleCorrect'));
});

test('validation ok for proper question', () => {
  const res = validateQuestion({ text:'Q?', type:'single', options:[{ text:'A', isCorrect:true },{ text:'B', isCorrect:false }] });
  assert.strictEqual(res.ok, true);
});
