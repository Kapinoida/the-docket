
import pool from '../src/lib/db';
import { createTask, markTaskCompleted, deleteCompletedTasks } from '../src/lib/api';

async function verifyDeleteCompleted() {
  const client = await pool.connect();
  try {
    console.log('1. Creating Task...');
    const task = await createTask('Task to be completed');
    console.log('Task created:', task.id);

    console.log('2. Marking Complete...');
    await markTaskCompleted(task.id);
    console.log('Task completed.');

    console.log('3. Deleting All Completed Tasks...');
    await deleteCompletedTasks();
    console.log('Deletion command sent.');

    console.log('4. Verifying...');
    const result = await client.query('SELECT * FROM tasks WHERE id = $1', [task.id]);
    
    if (result.rows.length === 0) {
      console.log('SUCCESS: Task gone.');
    } else {
      console.error('FAILURE: Task still exists.');
      process.exit(1);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

verifyDeleteCompleted();
