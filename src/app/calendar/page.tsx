"use client";

import { useState } from 'react';
import CalendarView from '../../components/CalendarView';
import { TaskInstance } from '@/types';

export default function CalendarPage() {
    // We could add a modal for task details here if we implemented onTaskSelect
    const handleTaskSelect = (task: TaskInstance) => {
        // Future: Open task detail modal
        console.log("Selected task", task);
    };

    return (
        <div className="flex h-screen bg-bg-primary">
            <CalendarView 
                onTaskSelect={handleTaskSelect}
                onTaskComplete={(taskId) => console.log("Completed task", taskId)}
            />
        </div>
    );
}
