'use client';

import { X, Calendar as CalendarIcon, MapPin, Clock, AlignLeft } from 'lucide-react';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any | null; // Using any for now to match CalendarEvent structure broadly
}

export default function EventDetailModal({ isOpen, onClose, event }: EventDetailModalProps) {
  if (!isOpen || !event) return null;

  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);

  const dateStr = startDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
  
  const timeStr = event.is_all_day 
    ? 'All Day' 
    : `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-bg-primary border border-border-default rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold text-text-primary leading-tight pr-4">
            {event.title || '(No Title)'}
          </h2>
          <button 
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-1 rounded-lg hover:bg-bg-tertiary transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Time */}
          <div className="flex items-start gap-3 text-text-secondary">
            <Clock className="w-5 h-5 mt-0.5 text-accent-blue" />
            <div>
              <div className="font-medium text-text-primary">{dateStr}</div>
              <div className="text-sm">{timeStr}</div>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3 text-text-secondary">
              <MapPin className="w-5 h-5 mt-0.5 text-red-500" />
              <div className="text-sm text-text-primary">{event.location}</div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-3 text-text-secondary">
               <AlignLeft className="w-5 h-5 mt-0.5" />
               <div className="text-sm whitespace-pre-wrap leading-relaxed text-text-primary">
                 {event.description}
               </div>
            </div>
          )}
          
          {/* Calendar Source */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border-subtle text-xs text-text-muted">
            <CalendarIcon className="w-3 h-3" />
            <span>Calendar source from remote</span>
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="flex justify-end gap-2 mt-6">
             <button
              onClick={onClose}
              className="px-4 py-2 bg-bg-secondary hover:bg-bg-tertiary text-text-primary rounded-lg transition-colors border border-border-subtle"
            >
              Close
            </button>
        </div>
      </div>
    </div>
  );
}
