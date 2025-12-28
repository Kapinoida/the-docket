const { parseTaskDate, extractDateFromContent } = require('./taskParser');

console.log('Testing Enhanced Date Parsing...');
const today = new Date();
today.setHours(12,0,0,0);
console.log('Reference Today:', today.toDateString());

const cases = [
    { input: 'Buy milk @tomorrow', hasDate: true, expectedDateStr: 'tomorrow' },
    { input: 'Buy milk due tomorrow', hasDate: true, expectedDateStr: 'tomorrow' },
    { input: 'Buy milk due friday', hasDate: true, expectedDateStr: 'friday' }, // day of week
    { input: 'Report due end of month', hasDate: true, expectedDateStr: 'end of month' },
    { input: 'Report due end of week', hasDate: true, expectedDateStr: 'end of week' },
    { input: 'Task with no date', hasDate: false },
    { input: 'Call Mom due today', hasDate: true, expectedDateStr: 'today' },
    { input: 'Project due next friday', hasDate: true, expectedDateStr: 'next friday' },
    { input: 'Another task @In 3 days', hasDate: true, expectedDateStr: 'In 3 days' },
];

let passed = 0;
let failed = 0;

cases.forEach(({ input, hasDate, expectedDateStr }) => {
    try {
        const { content, date, dateString } = extractDateFromContent(input);
        
        let success = true;
        
        if (hasDate && !date) success = false;
        if (!hasDate && date) success = false;
        // Verify content is stripped of date
        if (hasDate && content.includes(expectedDateStr)) success = false;

        if (success) {
            console.log(`[PASS] "${input}" -> Date: ${date ? date.toDateString() : 'None'}`);
            passed++;
        } else {
            console.log(`[FAIL] "${input}"`);
            console.log(`       Got Date: ${date ? date.toDateString() : 'None'}`);
            console.log(`       Got Content: "${content}"`);
            console.log(`       Raw Date String: "${dateString}"`);
            failed++;
        }
    } catch (e) {
        console.log(`[ERROR] "${input}": ${e.message}`);
        failed++;
    }
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
