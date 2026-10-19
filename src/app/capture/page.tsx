import { Metadata } from 'next';
import CaptureView from '../../components/v2/CaptureView';

export const metadata: Metadata = {
  title: 'Capture | The Docket',
  description: 'Quickly capture a thought into your Inbox.',
};

export default function CapturePage() {
  return <CaptureView />;
}
