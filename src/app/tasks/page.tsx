
import { Metadata } from 'next';
import AllTasksView from '../../components/v2/AllTasksView';

export const metadata: Metadata = {
  title: 'All Tasks | The Docket',
  description: 'Manage all your tasks.',
};

export default function TasksPage() {
  return (
    <main className="min-h-screen bg-bg-primary">
      <AllTasksView />
    </main>
  );
}
