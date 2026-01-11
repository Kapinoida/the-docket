
import pool, { createPage, createTask, addItemToPage, getPageItems, getItemContext } from '../src/lib/db';

async function runTest() {
  console.log('Testing V2 Data Model...');

  try {
    // 1. Create Pages
    console.log('\nCreating pages...');
    const homePage = await createPage('Home', { type: 'doc', content: [] });
    console.log('Created Home:', homePage.id, homePage.title);

    const projectPage = await createPage('Project Alpha', { type: 'doc', content: [] });
    console.log('Created Project:', projectPage.id, projectPage.title);

    // 2. Create Task
    console.log('\nCreating task...');
    const task = await createTask('Buy domain name');
    console.log('Created Task:', task.id, task.content);

    // 3. Place Task on Project Page
    console.log('\nPlacing task on Project Page...');
    await addItemToPage(projectPage.id, task.id, 'task');
    console.log('Task added to Project Page.');

    // 4. Place Project Page on Home Page (Subpage)
    console.log('\nPlacing Project Page on Home Page...');
    await addItemToPage(homePage.id, projectPage.id, 'page');
    console.log('Project Page added to Home Page.');

    // 5. Verify Page Items
    console.log(`\nItems on Project Page (${projectPage.id}):`);
    const projectItems = await getPageItems(projectPage.id);
    projectItems.forEach(item => {
      console.log(`- [${item.type}] ${item.type === 'task' ? (item.item as any).content : (item.item as any).title}`);
    });

    console.log(`\nItems on Home Page (${homePage.id}):`);
    const homeItems = await getPageItems(homePage.id);
    homeItems.forEach(item => {
      console.log(`- [${item.type}] ${item.type === 'task' ? (item.item as any).content : (item.item as any).title}`);
    });

    // 6. Verify Context (Reverse lookup)
    console.log(`\nContext for Task "${task.content}" (ID: ${task.id}):`);
    const taskContext = await getItemContext(task.id, 'task');
    taskContext.forEach(page => {
      console.log(`- Found on Page: ${page.title} (ID: ${page.id})`);
      // Note: Full ancestor traversal would be recursive, checking the context of these pages.
      // For now, checking direct parents is the first step.
    });
    
    // 7. Verify Context for Project Page
    console.log(`\nContext for Project Page "${projectPage.title}" (ID: ${projectPage.id}):`);
    const projectContext = await getItemContext(projectPage.id, 'page');
    projectContext.forEach(page => {
      console.log(`- Found on Page: ${page.title} (ID: ${page.id})`);
    });

  } catch (err) {
    console.error('Test Failed:', err);
  } finally {
    pool.end();
  }
}

runTest();
