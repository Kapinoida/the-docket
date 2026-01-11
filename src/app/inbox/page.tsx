
import { Metadata } from 'next';
import InboxView from '../../components/v2/InboxView';

export const metadata: Metadata = {
  title: 'Inbox | The Docket',
  description: 'Capture your thoughts and tasks.',
};

export default function InboxPage() {
  return (
    <main className="min-h-screen bg-bg-primary">
      <InboxView />
    </main>
  );
}
