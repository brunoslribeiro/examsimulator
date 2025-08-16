const { test } = require('node:test');
const assert = require('node:assert');
const { renderList } = require('../public/questions-utils.js');

test('renderList outputs rows with highlight', () => {
  const items = [{ _id:'1', text:'Hello World', topic:'T', status:'draft', updatedAt:'2024-01-01', type:'single', imagePath:'' }];
  const html = renderList(items, 'world');
  assert(html.includes('Hello'));
  assert(html.toLowerCase().includes('<mark>world</mark>'));
  assert(html.includes('overflow'));
  assert(html.includes('row-menu'));
});
