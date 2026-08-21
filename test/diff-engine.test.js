const assert = require('assert');
const DiffEngine = require('../js/diff-engine.js');

console.log('Running DiffEngine test suite...\n');

// Test 1: Identical strings
{
  const text = 'Hello world\nSecond line';
  const edits = DiffEngine.computeLineDiff(text, text);
  const stats = DiffEngine.computeStats(edits);
  assert.strictEqual(stats.isIdentical, true);
  assert.strictEqual(stats.additions, 0);
  assert.strictEqual(stats.deletions, 0);
  console.log('✓ Test 1 Passed: Identical strings');
}

// Test 2: Word Diff in Split View
{
  const textA = 'Line 1\nconst status = "pending";\nLine 3';
  const textB = 'Line 1\nconst status = "completed";\nLine 3\nLine 4';
  const edits = DiffEngine.computeLineDiff(textA, textB);
  const splitWord = DiffEngine.alignSplitDiff(edits, { diffMode: 'word' });
  const stats = DiffEngine.computeStats(edits);

  assert.strictEqual(stats.isIdentical, false);
  assert.strictEqual(stats.deletions, 1);
  assert.strictEqual(stats.additions, 2);

  // Split should have 4 rows
  assert.strictEqual(splitWord.length, 4);
  assert.strictEqual(splitWord[0].type, 'equal');
  assert.strictEqual(splitWord[1].type, 'modified');
  assert(splitWord[1].left.html.includes('<span class="diff-token-del">pending</span>'));
  assert(splitWord[1].right.html.includes('<span class="diff-token-add">completed</span>'));
  assert.strictEqual(splitWord[2].type, 'equal');
  assert.strictEqual(splitWord[3].type, 'add');

  console.log('✓ Test 2 Passed: Word Diff in Split View');
}

// Test 3: Char Diff in Split View
{
  const textA = 'cat\ncolor: grey;';
  const textB = 'cart\ncolor: gray;';
  const edits = DiffEngine.computeLineDiff(textA, textB);
  const splitChar = DiffEngine.alignSplitDiff(edits, { diffMode: 'char' });

  assert.strictEqual(splitChar.length, 2);
  // Row 1: cat vs cart (char 'r' added)
  assert.strictEqual(splitChar[0].type, 'modified');
  assert(splitChar[0].right.html.includes('<span class="diff-token-add">r</span>'));

  // Row 2: grey vs gray (char 'e' deleted, char 'a' added)
  assert.strictEqual(splitChar[1].type, 'modified');
  assert(splitChar[1].left.html.includes('<span class="diff-token-del">e</span>'));
  assert(splitChar[1].right.html.includes('<span class="diff-token-add">a</span>'));

  console.log('✓ Test 3 Passed: Char Diff in Split View');
}

// Test 3b: Contiguous added/deleted words merged into a single span
{
  const lineA = 'const x = 1;';
  const lineB = 'const x = calculateTotal(items, 0.05);';
  const intra = DiffEngine.computeIntraLineDiff(lineA, lineB, { diffMode: 'word' });

  // The entire expression "calculateTotal(items, 0.05);" is merged into a single continuous highlight
  assert.strictEqual(intra.addHtml, 'const x = <span class="diff-token-add">calculateTotal(items, 0.05);</span>');
  assert.strictEqual(intra.delHtml, 'const x = <span class="diff-token-del">1;</span>');
  console.log('✓ Test 3b Passed: Contiguous added/deleted words merged into a single span');
}

// Test 3c: Multi-word phrase removal merged into one single block
{
  const lineA = '  // Calculate tax amount';
  const lineB = '  // Apply discount if provided';
  const intra = DiffEngine.computeIntraLineDiff(lineA, lineB, { diffMode: 'word' });

  assert.strictEqual(intra.delHtml, '  // <span class="diff-token-del">Calculate tax amount</span>');
  assert.strictEqual(intra.addHtml, '  // <span class="diff-token-add">Apply discount if provided</span>');
  console.log('✓ Test 3c Passed: Multi-word phrase removal merged into one single block');
}

// Test 4: Ignore Blank Lines
{
  const textA = 'Line 1\n\n\nLine 2\n  \nLine 3';
  const textB = 'Line 1\nLine 2\nLine 3\n\n';

  const editsNormal = DiffEngine.computeLineDiff(textA, textB);
  assert.strictEqual(DiffEngine.computeStats(editsNormal).isIdentical, false);

  const editsIgnoreBlank = DiffEngine.computeLineDiff(textA, textB, { ignoreBlankLines: true });
  assert.strictEqual(DiffEngine.computeStats(editsIgnoreBlank).isIdentical, true);
  console.log('✓ Test 4 Passed: Ignore Blank Lines');
}

// Test 5: Options - Ignore Whitespace and Ignore Case
{
  const textA = 'HELLO  WORLD\n';
  const textB = 'hello world\n';

  const editsStrict = DiffEngine.computeLineDiff(textA, textB);
  assert.strictEqual(DiffEngine.computeStats(editsStrict).isIdentical, false);

  const editsOptions = DiffEngine.computeLineDiff(textA, textB, { ignoreCase: true, ignoreWhitespace: true });
  assert.strictEqual(DiffEngine.computeStats(editsOptions).isIdentical, true);
  console.log('✓ Test 5 Passed: Options (ignoreCase, ignoreWhitespace)');
}

// Test 6: Empty inputs and edge cases
{
  assert.deepStrictEqual(DiffEngine.computeLineDiff('', ''), []);

  const editsFromEmpty = DiffEngine.computeLineDiff('', 'Line 1\nLine 2');
  assert.strictEqual(editsFromEmpty.length, 2);
  assert.strictEqual(editsFromEmpty[0].type, 'add');

  const editsToEmpty = DiffEngine.computeLineDiff('Line 1\nLine 2', '');
  assert.strictEqual(editsToEmpty.length, 2);
  assert.strictEqual(editsToEmpty[0].type, 'del');
  console.log('✓ Test 6 Passed: Empty string edge cases');
}

// Test 7: HTML Escaping
{
  const textA = '<script>alert("xss")</script>';
  const textB = '<script>alert("clean")</script>';
  const intra = DiffEngine.computeIntraLineDiff(textA, textB, { diffMode: 'word' });
  assert(!intra.delHtml.includes('<script>'));
  assert(intra.delHtml.includes('&lt;script&gt;'));
  assert(intra.addHtml.includes('&lt;script&gt;'));
  console.log('✓ Test 7 Passed: HTML escaping in diff renderer');
}

// Test 8: Unicode and Emoji handling
{
  const textA = 'Diff with 🚀 Rocket';
  const textB = 'Diff with ✨ Sparkles';
  const intra = DiffEngine.computeIntraLineDiff(textA, textB, { diffMode: 'word' });
  assert(intra.delHtml.includes('🚀'));
  assert(intra.addHtml.includes('✨'));
  console.log('✓ Test 8 Passed: Unicode & Emoji diffing');
}

console.log('\nAll 8 DiffEngine tests passed successfully! 🎉');
