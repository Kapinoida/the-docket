const { parseTaskDate, parseTasksFromContent } = require('./taskParser');

// Mock date for consistent testing
// const mockToday = new Date('2025-08-06T12:00:00');
// We relying on system time so be careful or mock the Date object if needed.
// For now, let's just log the output and inspect manually or assert relative.

console.log('Testing Smart Date Parsing...');
const today = new Date();
today.setHours(0,0,0,0);
console.log('Today is:', today.toDateString());

const testCases = [
  '@today',
  '@tomorrow',
  '@next friday',
  '@in 3 days',
  '@monday',
  '@2025-12-25'
];

testCases.forEach(str => {
  const dateStr = str.substring(1); // remove @
  const result = parseTaskDate(dateStr);
  console.log(`"${str}" -> ${result ? result.toDateString() : 'null'}`);
});

console.log('\nTesting Content Parsing...');
const content = `
- [ ] Simple task @today
- [ ] Future task @next friday
- [ ] Count task @in 5 days
- [ ] Hardcoded @2025-10-10
`;

const parsed = parseTasksFromContent(content);
parsed.tasks.forEach(t => {
  console.log(`Task: "${t.content}" | Date: ${t.dateString} -> ${t.dueDate ? new Date(t.dueDate).toDateString() : 'null'}`);
});
