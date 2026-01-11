import React, { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, addDays, nextMonday, nextFriday } from 'date-fns';
import { Calendar, Repeat, X, ChevronRight, Check } from 'lucide-react';
import { RecurrenceRule } from '@/types/v2';
import 'react-day-picker/dist/style.css'; 

interface DatePickerPopoverProps {
    date?: Date | null;
    recurrenceRule?: RecurrenceRule;
    onSelect: (date: Date | null, recurrence?: RecurrenceRule) => void;
    onClose: () => void;
    position?: { top?: number; left?: number; right?: number };
}

type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none';

export function DatePickerPopover({ date, recurrenceRule, onSelect, onClose, position }: DatePickerPopoverProps) {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(date ? new Date(date) : undefined);
    
    // Recurrence State
    const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(recurrenceRule?.type || 'none');
    const [interval, setInterval] = useState<number>(recurrenceRule?.interval || 1);
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>(recurrenceRule?.daysOfWeek || []);
    const [weekOfMonth, setWeekOfMonth] = useState<number>(recurrenceRule?.weekOfMonth || 1); // Default to first
    
    // UI State for Custom Mode
    const [showCustom, setShowCustom] = useState(false);

    useEffect(() => {
        // Initialize state if rule exists
        if (recurrenceRule) {
             setRecurrenceType(recurrenceRule.type);
             setInterval(recurrenceRule.interval);
             setDaysOfWeek(recurrenceRule.daysOfWeek || []);
             setWeekOfMonth(recurrenceRule.weekOfMonth || 1);
        }
    }, [recurrenceRule]);

    const handleDaySelect = (d: Date | undefined) => {
        setSelectedDate(d);
    };

    const handleQuickSelect = (type: 'today' | 'tomorrow' | 'next-week') => {
        const today = new Date();
        let newDate;
        switch (type) {
            case 'today': newDate = today; break;
            case 'tomorrow': newDate = addDays(today, 1); break;
            case 'next-week': newDate = nextMonday(today); break;
        }
        setSelectedDate(newDate);
    };

    const handleSave = () => {
        let finalRule: RecurrenceRule | undefined = undefined;

        if (recurrenceType !== 'none') {
            finalRule = {
                type: recurrenceType,
                interval: Math.max(1, interval),
                daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : undefined,
                weekOfMonth: weekOfMonth
            };
        }

        onSelect(selectedDate || null, finalRule);
        onClose();
    };

    const toggleDayOfWeek = (dayIndex: number) => {
        if (daysOfWeek.includes(dayIndex)) {
            setDaysOfWeek(daysOfWeek.filter(d => d !== dayIndex));
        } else {
            setDaysOfWeek([...daysOfWeek, dayIndex].sort());
        }
    };

    // Helper to render readable recurrence summary
    const getRecurrenceSummary = () => {
        if (recurrenceType === 'none') return 'No repeat';
        if (interval === 1 && recurrenceType === 'daily') return 'Daily';
        if (interval === 1 && recurrenceType === 'weekly' && daysOfWeek.length === 0) return 'Weekly';
        if (interval === 1 && recurrenceType === 'monthly' && daysOfWeek.length === 0) return 'Monthly';
        return 'Custom...';
    };

    // Styling overrides for react-day-picker
    const css = `
        .rdp { --rdp-cell-size: 32px; --rdp-accent-color: #3b82f6; background-color: var(--rdp-background-color); margin: 0; }
        .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: rgba(0,0,0,0.05); }
    `;

    return (
        <div 
            className="absolute z-50 bg-bg-primary border border-border-default rounded-xl shadow-2xl p-4 w-[340px] flex flex-col gap-3"
            style={position ? { top: position.top, left: position.left, right: position.right } : {}}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <style>{css}</style>
            
            {/* Header */}
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                    <Calendar size={14} /> Set Date
                </h4>
                <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={14}/></button>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
                <button onClick={() => handleQuickSelect('today')} className="text-xs px-2 py-1 bg-bg-tertiary rounded hover:bg-bg-accent text-text-secondary border border-border-subtle">Today</button>
                <button onClick={() => handleQuickSelect('tomorrow')} className="text-xs px-2 py-1 bg-bg-tertiary rounded hover:bg-bg-accent text-text-secondary border border-border-subtle">Tomorrow</button>
                <button onClick={() => handleQuickSelect('next-week')} className="text-xs px-2 py-1 bg-bg-tertiary rounded hover:bg-bg-accent text-text-secondary border border-border-subtle">Next Week</button>
            </div>

            {/* Calendar */}
            <div className="border border-border-default rounded-lg p-2 bg-bg-secondary flex justify-center">
                <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDaySelect}
                    showOutsideDays
                />
            </div>

            {/* Recurrence Selector */}
            <div className={`border border-border-default rounded-lg overflow-hidden transition-all duration-200 ${showCustom ? 'bg-bg-secondary' : 'bg-transparent'}`}>
                {/* Basic Select Mode */}
                {!showCustom ? (
                    <div className="flex items-center gap-2 p-2" onClick={() => setShowCustom(true)}>
                        <Repeat size={14} className="text-text-muted" />
                        <span className="text-sm text-text-secondary flex-1 cursor-pointer hover:text-text-primary">
                            {getRecurrenceSummary()}
                        </span>
                        <ChevronRight size={14} className="text-text-muted" />
                    </div>
                ) : (
                    /* Custom Recurrence Editor */
                    <div className="p-3 text-sm flex flex-col gap-3">
                        <div className="flex items-center justify-between pb-2 border-b border-border-subtle mb-1">
                            <span className="font-medium text-text-primary">Repeat</span>
                            <button onClick={() => setShowCustom(false)} className="text-xs text-blue-500 hover:underline">Done</button>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-text-secondary w-12">Every</span>
                            <input 
                                type="number" 
                                min="1" 
                                value={interval} 
                                onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                                className="w-12 bg-bg-primary border border-border-default rounded px-1 py-0.5 text-center text-text-primary"
                            />
                            <select 
                                value={recurrenceType} 
                                onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
                                className="bg-bg-primary border border-border-default rounded px-2 py-0.5 text-text-primary flex-1"
                            >
                                <option value="none">None</option>
                                <option value="daily">Day(s)</option>
                                <option value="weekly">Week(s)</option>
                                <option value="monthly">Month(s)</option>
                                <option value="yearly">Year(s)</option>
                            </select>
                        </div>

                        {recurrenceType === 'weekly' && (
                            <div className="flex justify-between gap-1 pt-2">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => toggleDayOfWeek(idx)}
                                        className={`w-7 h-7 rounded-full text-xs flex items-center justify-center transition-colors ${
                                            daysOfWeek.includes(idx) 
                                            ? 'bg-blue-500 text-white' 
                                            : 'bg-bg-tertiary text-text-muted hover:bg-bg-accent'
                                        }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        )}

                        {recurrenceType === 'monthly' && (
                            <div className="flex flex-col gap-2 pt-2">
                                <div className="text-xs text-text-muted">On the:</div>
                                <div className="flex gap-2">
                                    <select 
                                        value={weekOfMonth}
                                        onChange={(e) => setWeekOfMonth(parseInt(e.target.value))}
                                        className="bg-bg-primary border border-border-default rounded px-2 py-1 text-xs text-text-primary flex-1"
                                    >
                                        <option value={1}>First</option>
                                        <option value={2}>Second</option>
                                        <option value={3}>Third</option>
                                        <option value={4}>Fourth</option>
                                        <option value={-1}>Last</option>
                                    </select>
                                    <select 
                                        value={daysOfWeek[0] ?? ''} // Default to empty if not set
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setDaysOfWeek(val === '' ? [] : [parseInt(val)]);
                                        }}
                                        className="bg-bg-primary border border-border-default rounded px-2 py-1 text-xs text-text-primary flex-1"
                                    >
                                        <option value="">Day...</option>
                                        <option value="0">Sunday</option>
                                        <option value="1">Monday</option>
                                        <option value="2">Tuesday</option>
                                        <option value="3">Wednesday</option>
                                        <option value="4">Thursday</option>
                                        <option value="5">Friday</option>
                                        <option value="6">Saturday</option>
                                    </select>
                                </div>
                                <div className="text-xs text-text-muted italic">
                                    Note: Leave "Day" empty to repeat on the same date (e.g. 15th).
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
                <button onClick={() => { onSelect(null); onClose(); }} className="text-xs text-text-muted hover:text-red-500 px-2 py-1">Clear Date</button>
                <button onClick={handleSave} className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-md font-medium shadow-sm">Save</button>
            </div>
        </div>
    );
}
