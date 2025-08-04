// Quick test to see if the regex is working
const testContent = `
Here are my tasks:
- [ ] First task @today  
- [x] Completed task @tomorrow
- [ ] Another task @2024-12-25
`;

// Simulate the regex from taskParser.ts
const TASK_REGEX = /^(\s*)-\s*\[([x\s])\]\s+(.+?)(\s+@(\w+|\d{4}-\d{2}-\d{2}))?\s*$/gm;

console.log('Testing task regex on content:');
console.log(testContent);
console.log('\nMatches found:');

let match;
let matchCount = 0;
TASK_REGEX.lastIndex = 0;

while ((match = TASK_REGEX.exec(testContent)) !== null) {
  matchCount++;
  const [fullMatch, indent, checkboxState, taskContent, dateGroup, dateString] = match;
  console.log(`${matchCount}. Full match: "${fullMatch}"`);
  console.log(`   - Indent: "${indent}"`);
  console.log(`   - Checkbox: "${checkboxState}"`);
  console.log(`   - Content: "${taskContent}"`);
  console.log(`   - Date Group: "${dateGroup || 'none'}"`);
  console.log(`   - Date: "${dateString || 'none'}"`);
  console.log();
}

console.log(`Total matches: ${matchCount}`);