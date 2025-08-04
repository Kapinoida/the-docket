// Test the full task creation pipeline
const { parseTasksFromContent } = require('./src/lib/taskParser.ts');

// Simulate what happens when a user types in the editor
const testContent = `# My Notes

Here are some tasks I need to complete:

- [ ] Review the project requirements @today
- [x] Set up the development environment @yesterday  
- [ ] Write unit tests @2024-12-25
- [ ] Deploy to staging @tomorrow
- [ ] Meeting with client next week

Some regular text here...

- [ ] Another task without a date
- [x] Completed task @2024-01-15

More notes and content...`;

console.log('=== Testing Full Task Parsing Pipeline ===\n');

// Step 1: Parse tasks from content
console.log('Step 1: Parsing tasks from content...');
const result = parseTasksFromContent(testContent);

console.log(`Found ${result.tasks.length} tasks:`);
result.tasks.forEach((task, index) => {
  console.log(`${index + 1}. "${task.content}"`);
  console.log(`   - ID: ${task.id}`);
  console.log(`   - Completed: ${task.completed}`);
  console.log(`   - Due Date: ${task.dueDate ? task.dueDate.toISOString() : 'None'}`);
  console.log(`   - Date String: ${task.dateString || 'None'}`);
  console.log(`   - Position: ${task.startIndex}-${task.endIndex}`);
  console.log();
});

// Step 2: Simulate API call payload
console.log('Step 2: Simulating API call payload...');
const apiPayload = {
  tasks: result.tasks,
  noteId: "1" // Simulated note ID
};

console.log('API Payload:');
console.log(JSON.stringify({
  tasksCount: apiPayload.tasks.length,
  noteId: apiPayload.noteId,
  tasks: apiPayload.tasks.map(t => ({
    content: t.content,
    dueDate: t.dueDate,
    completed: t.completed,
    dateString: t.dateString
  }))
}, null, 2));

console.log('\n=== Test Complete ===');
console.log('If you see tasks listed above, the parsing is working correctly.');
console.log('Next step: Check browser console for debugging output when using the app.');