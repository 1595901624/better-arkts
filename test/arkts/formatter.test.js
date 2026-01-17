const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { formatArkTS } = require('../../out/arkts/format');

function readUtf8(p) {
  return fs.readFileSync(p, 'utf8');
}

describe('ArkTS formatter', () => {
  const goldenPath = path.join(__dirname, '..', 'test.ets');

  it('formats test/test.ets to the golden file (CRLF)', () => {
    const input = readUtf8(goldenPath);
    const out = formatArkTS(input, { indentSize: 4, eol: '\r\n', maxLineLength: 120 });
    assert.ok(out !== null, 'formatArkTS returned null');
    assert.strictEqual(out, input);
  });

  it('is idempotent', () => {
    const input = readUtf8(goldenPath);
    const out1 = formatArkTS(input, { indentSize: 4, eol: '\r\n', maxLineLength: 120 });
    assert.ok(out1 !== null, 'formatArkTS returned null');

    const out2 = formatArkTS(out1, { indentSize: 4, eol: '\r\n', maxLineLength: 120 });
    assert.ok(out2 !== null, 'formatArkTS returned null');

    assert.strictEqual(out2, out1);
  });
});
