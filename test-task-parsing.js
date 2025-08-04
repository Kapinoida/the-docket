// Simple test of task parsing functionality
const { parseTasksFromContent, formatTaskDate } = require('./src/lib/taskParser.ts');

// Test content with various task formats
const testContent = `
# My Project Notes

Here are some tasks I need to complete:

- [ ] Review the project requirements @today
- [x] Set up the development environment @yesterday  
- [ ] Write unit tests @2024-12-25
- [ ] Deploy to staging @tomorrow
- [ ] Meeting with client next week

Some regular text here...

- [ ] Another task without a date
- [x] Completed task @2024-01-15

More notes and content...
`;

console.log('Testing task parsing...\n');

const result = parseTasksFromContent(testContent);

console.log(`Found ${result.tasks.length} tasks:`);
result.tasks.forEach((task, index) => {
  console.log(`${index + 1}. "${task.content}"`);
  console.log(`   - Completed: ${task.completed}`);
  console.log(`   - Due: ${task.dateString || 'No date'}`);
  console.log(`   - Parsed Date: ${task.dueDate ? task.dueDate.toDateString() : 'None'}`);
  console.log(`   - Formatted: ${formatTaskDate(task.dueDate)}`);
  console.log();
});

console.log('\nProcessed content:');
console.log(result.processedContent.substring(0, 500) + '...');