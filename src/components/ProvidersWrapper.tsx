'use client';

import { usePathname } from 'next/navigation';
import { ThemeProvider } from '../components/ThemeProvider';
import { TaskEditProvider } from '../contexts/TaskEditContext';
import { ToastProvider } from '../contexts/ToastContext';
import { SyncProvider } from '../contexts/SyncContext';
import { SoundProvider } from '../contexts/SoundContext';
import { CommandPalette } from '../components/CommandPalette';
import LayoutWrapper from '../components/v2/LayoutWrapper';
import PwaRegister from '../components/PwaRegister';
import FloatingSoundIndicator from '../components/focus/FloatingSoundIndicator';

export default function ProvidersWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Login page doesn't need the app shell — mounting SyncProvider, LayoutWrapper,
  // Sidebar, etc. on /login triggers API calls that get 401s, causing the exact
  // infinite redirect loop this prevents.
  if (pathname === '/login') {
    return (
      <ThemeProvider
        attribute="class"
        forcedTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider
      attribute="class"
      forcedTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <ToastProvider>
        <SoundProvider>
          <SyncProvider>
            <TaskEditProvider>
              <PwaRegister />
              <CommandPalette />
              <LayoutWrapper>
                {children}
              </LayoutWrapper>
              <FloatingSoundIndicator />
            </TaskEditProvider>
          </SyncProvider>
        </SoundProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
