'use client';

import { Folder } from '@/types';

interface RightSidebarProps {
  selectedFolder: Folder | null;
}

export default function RightSidebar({ selectedFolder }: RightSidebarProps) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 flex-1 overflow-y-auto overflow-x-hidden">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
          Tasks & Properties
        </h2>

        {/* Today's Tasks */}
        <div className="mb-6">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Today's Tasks
          </h3>
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-700 rounded">
              No tasks due today
            </div>
          </div>
        </div>

        {/* This Week */}
        <div className="mb-6">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            This Week
          </h3>
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-700 rounded">
              No tasks this week
            </div>
          </div>
        </div>

        {/* Folder Properties */}
        {selectedFolder && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Folder Properties
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 space-y-2">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Name:</span>
                <div className="text-sm text-gray-900 dark:text-white font-medium">
                  {selectedFolder.name}
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Created:</span>
                <div className="text-sm text-gray-900 dark:text-white">
                  {new Date(selectedFolder.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Notes:</span>
                <div className="text-sm text-gray-900 dark:text-white">0</div>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Tasks:</span>
                <div className="text-sm text-gray-900 dark:text-white">0</div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-6">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              📝 New Note
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              ✅ New Task
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              📁 New Folder
            </button>
            <button className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              🗓️ View Agenda
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Recent Activity
          </h3>
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-700 rounded">
              No recent activity
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}