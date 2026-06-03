"use client";

import { useState } from 'react';
import CalendarViewV2 from '../../components/CalendarView';
import AddCalendarModal from '../../components/modals/AddCalendarModal';
import EventDetailModal from '../../components/modals/EventDetailModal';

export default function CalendarPage() {
    return (
        <div className="flex h-screen bg-bg-primary">
            <CalendarViewV2 />
        </div>
    );
}
