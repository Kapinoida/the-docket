'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { Task } from '@/types';
import { CalendarEvent } from '@/lib/calendar';
import { addDays, startOfDay } from 'date-fns';

interface SyncContextType {
    tasks: Task[];
    events: CalendarEvent[];
    initialLoading: boolean;
    isFetching: boolean;
    refetch: () => void;
    updateLocalTask: (id: number, patch: Partial<Task>) => void;
    removeLocalTask: (id: number) => void;
    addLocalTask: (task: Task) => void;
}

const SyncContext = createContext<SyncContextType | null>(null);

export const useSync = () => {
    const context = useContext(SyncContext);
    if (!context) {
        throw new Error('useSync must be used within a SyncProvider');
    }
    return context;
};

const POLL_INTERVAL_MS = 30000;
const EVENT_WINDOW_DAYS = 180;

export function SyncProvider({ children }: { children: ReactNode }) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const fetchInProgressRef = useRef(false);
    const lastFetchTimeRef = useRef<Date | null>(null);

    const fetchData = useCallback(async (useDelta: boolean) => {
        if (fetchInProgressRef.current) return;
        fetchInProgressRef.current = true;
        setIsFetching(true);
        try {
            const now = new Date();
            const eventStart = startOfDay(addDays(now, -EVENT_WINDOW_DAYS));
            const eventEnd = addDays(now, EVENT_WINDOW_DAYS);

            const since = useDelta && lastFetchTimeRef.current ? `?since=${lastFetchTimeRef.current.toISOString()}` : '';
            const tasksUrl = `/api/v2/tasks${since}`;
            const eventsUrl = `/api/v2/calendar/events?start=${eventStart.toISOString()}&end=${eventEnd.toISOString()}`;

            const [tasksRes, eventsRes] = await Promise.all([
                fetch(tasksUrl),
                fetch(eventsUrl),
            ]);

            if (tasksRes.ok) {
                const tasksData: Task[] = await tasksRes.json();
                if (useDelta && lastFetchTimeRef.current) {
                    setTasks(prev => {
                        const map = new Map(prev.map(t => [t.id, t]));
                        for (const task of tasksData) {
                            map.set(task.id, task);
                        }
                        return Array.from(map.values());
                    });
                } else {
                    setTasks(tasksData);
                }
            }
            if (eventsRes.ok) {
                setEvents(await eventsRes.json());
            }
            lastFetchTimeRef.current = now;
        } catch (e) {
            console.error('Sync fetch error:', e);
        } finally {
            setInitialLoading(false);
            setIsFetching(false);
            fetchInProgressRef.current = false;
        }
    }, []);

    useEffect(() => {
        fetchData(false);
    }, [fetchData]);

    useEffect(() => {
        const interval = setInterval(() => { fetchData(true); }, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchData]);

    useEffect(() => {
        const sync = () => { fetchData(false); };
        window.addEventListener('taskCreated', sync);
        window.addEventListener('taskUpdated', sync);
        window.addEventListener('taskDeleted', sync);
        return () => {
            window.removeEventListener('taskCreated', sync);
            window.removeEventListener('taskUpdated', sync);
            window.removeEventListener('taskDeleted', sync);
        };
    }, [fetchData]);

    const refetch = useCallback(() => {
        return fetchData(false);
    }, [fetchData]);

    const updateLocalTask = useCallback((id: number, patch: Partial<Task>) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    }, []);

    const removeLocalTask = useCallback((id: number) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    }, []);

    const addLocalTask = useCallback((task: Task) => {
        setTasks(prev => [task, ...prev]);
    }, []);

    return (
        <SyncContext.Provider value={{ tasks, events, initialLoading, isFetching, refetch, updateLocalTask, removeLocalTask, addLocalTask }}>
            {children}
        </SyncContext.Provider>
    );
}