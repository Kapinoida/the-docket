# Day View with Drag-and-Drop Scheduling — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a time-slot day view to the calendar with drag-and-drop event rescheduling that syncs back to CalDAV.

**Architecture:** Add `'day'` as a third ViewType in CalendarView. Build a DayView component with an hourly grid (12 AM–11 PM) and absolutely-positioned event blocks. Drag-and-drop uses HTML5 drag API on desktop and touch event handlers on mobile. A new PATCH endpoint modifies the ICAL DTSTART/DTEND and pushes the update back to the CalDAV server via `tsdav.updateCalendarObject`.

**Tech Stack:** React + TypeScript, date-fns, tsdav, ical.js, existing CalDAV config/event infrastructure.

---

## Prerequisites

- The Docket already syncs calendar events from CalDAV servers into `calendar_events` table
- Events have `raw_data` (full ICAL string), `etag`, `uid`, and `calendar_id`
- `tsdav` provides `updateCalendarObject({ calendarObject: { url, data, etag } })`
- CalendarView currently supports `'week' | 'month'` ViewType

---

### Task 1: Create PATCH endpoint for event time updates

**Objective:** Add an API endpoint that updates an event's start/end time in both the local DB and the remote CalDAV server.

**Files:**
- Create: `src/pages/api/v2/calendar/events/[id].ts`

**Step 1: Create the endpoint**

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import pool from '../../../../../lib/db';
import { getCalDAVClient } from '../../../../../lib/caldav';
import ICAL from 'ical.js';
import { updateCalendarObject } from 'tsdav';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { id } = req.query;
    const { start_time, end_time } = req.body;

    if (!id || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing id, start_time, or end_time' });
    }

    // 1. Fetch the event with calendar config
    const result = await pool.query(`
      SELECT e.*, c.server_url, c.username, c.password, c.calendar_url
      FROM calendar_events e
      JOIN caldav_configs c ON e.calendar_id = c.id
      WHERE e.id = $1 AND c.enabled = TRUE
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = result.rows[0];
    const newStart = new Date(start_time);
    const newEnd = new Date(end_time);

    // 2. Update local DB immediately (optimistic)
    await pool.query(`
      UPDATE calendar_events 
      SET start_time = $1, end_time = $2, last_synced_at = NOW()
      WHERE id = $3
    `, [newStart.toISOString(), newEnd.toISOString(), id]);

    // 3. If we have raw_data, push update to CalDAV
    if (event.raw_data && event.uid && event.calendar_url) {
      try {
        // Parse and modify the ICAL data
        const jcal = ICAL.parse(event.raw_data);
        const vcal = new ICAL.Component(jcal);
        const vevent = vcal.getFirstSubcomponent('vevent');
        
        if (vevent) {
          // Update DTSTART
          const dtstart = vevent.getFirstProperty('dtstart');
          if (dtstart) {
            const icalDt = ICAL.Time.fromJSDate(newStart, !event.is_all_day);
            vevent.updatePropertyWithValue('dtstart', icalDt);
          }
          
          // Update DTEND
          const dtend = vevent.getFirstProperty('dtend');
          if (dtend) {
            const icalDt = ICAL.Time.fromJSDate(newEnd, !event.is_all_day);
            vevent.updatePropertyWithValue('dtend', icalDt);
          }

          const updatedRawData = vcal.toString();

          // Push to CalDAV server
          const client = await getCalDAVClient({
            server_url: event.server_url,
            username: event.username,
            password: event.password,
          } as any);
          await client.login();

          await updateCalendarObject({
            calendarObject: {
              url: `${event.calendar_url}${event.uid}.ics`,
              data: updatedRawData,
              etag: event.etag || undefined,
            },
          });

          // Update local raw_data and etag
          await pool.query(`
            UPDATE calendar_events SET raw_data = $1 WHERE id = $2
          `, [updatedRawData, id]);
        }
      } catch (caldavError: any) {
        console.error('CalDAV update failed (local DB already updated):', caldavError.message);
        // Don't fail the request — local update already persisted
        return res.status(200).json({ 
          success: true, 
          warning: 'Local updated, remote sync failed: ' + caldavError.message 
        });
      }
    }

    // 4. Fetch and return the updated event
    const updated = await pool.query(`
      SELECT e.*, c.name as calendar_name, c.color as calendar_color
      FROM calendar_events e
      JOIN caldav_configs c ON e.calendar_id = c.id
      WHERE e.id = $1
    `, [id]);

    return res.status(200).json(updated.rows[0]);
  } catch (error: any) {
    console.error('PATCH event error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

**Step 2: Verify the endpoint compiles**

```bash
cd /Users/dcplaskett/MyServer/the-docket && npm run build 2>&1 | grep -E "error|✓"
```

Expected: `✓ Compiled successfully`

**Step 3: Test with curl (after deploy)**

```bash
curl -X PATCH http://localhost:8088/api/v2/calendar/events/1 \
  -H "Content-Type: application/json" \
  -d '{"start_time":"2026-06-10T15:00:00Z","end_time":"2026-06-10T16:00:00Z"}'
```

Note: Will get 401 without auth cookie — verify through browser instead.

**Step 4: Commit**

```bash
git add src/pages/api/v2/calendar/events/[id].ts
git commit -m "feat: PATCH endpoint for event time updates with CalDAV sync"
```

---

### Task 2: Add 'day' ViewType to CalendarView

**Objective:** Extend the view toggle to include 'day' and scaffold the DayView component.

**Files:**
- Modify: `src/components/CalendarView.tsx` (ViewType, toggle buttons)

**Step 1: Update ViewType**

In CalendarView.tsx, change:
```typescript
type ViewType = 'week' | 'month';
```
to:
```typescript
type ViewType = 'week' | 'month' | 'day';
```

**Step 2: Add 'Day' button to view toggle**

Find the view toggle buttons (around line 175-190) and add a third button:

```tsx
<button
  onClick={() => { setViewType('day'); setSelectedDay(startOfDay(new Date())); }}
  className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
    viewType === 'day' 
      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
  }`}
>
  Day
</button>
```

**Step 3: Add placeholder DayView rendering**

Below the month grid, add a placeholder for the day view:

```tsx
{viewType === 'day' && (
  <DayView 
    selectedDay={selectedDay}
    events={events}
    tasks={tasks}
    onEventClick={handleEventClick}
  />
)}
```

**Step 4: Create stub DayView component**

At the end of CalendarView.tsx (after DesktopMonthDay), add:

```tsx
function DayView({ selectedDay, events, tasks, onEventClick }: { 
  selectedDay: Date; 
  events: CalendarEvent[]; 
  tasks: Task[]; 
  onEventClick?: (e: CalendarEvent) => void;
}) {
  const dayEvents = events.filter(e => {
    const eventDate = isTrulyAllDay(e) 
      ? (parseLocalDateNode(e.start_time) as Date) 
      : new Date(e.start_time);
    return isSameDay(eventDate, selectedDay);
  });

  return (
    <div className="mt-4 p-4 border rounded-xl bg-bg-secondary">
      <h3 className="text-lg font-semibold mb-2">
        {format(selectedDay, 'EEEE, MMMM d')}
      </h3>
      <p className="text-text-muted text-sm">{dayEvents.length} events</p>
    </div>
  );
}
```

**Step 5: Build and verify**

```bash
cd /Users/dcplaskett/MyServer/the-docket && npm run build
```

Expected: Clean build, Day button visible in UI.

**Step 6: Commit**

```bash
git add src/components/CalendarView.tsx
git commit -m "feat: add 'day' ViewType with stub DayView component"
```

---

### Task 3: Build the time-slot grid

**Objective:** Render a scrollable hour grid (12 AM–11 PM) with time labels and dashed row dividers.

**Files:**
- Modify: `src/components/CalendarView.tsx` (DayView function)

**Step 1: Replace DayView stub with time grid**

```tsx
function DayView({ selectedDay, events, tasks, onEventClick }: { 
  selectedDay: Date; 
  events: CalendarEvent[]; 
  tasks: Task[]; 
  onEventClick?: (e: CalendarEvent) => void;
}) {
  const HOUR_HEIGHT = 60; // px per hour
  const HOUR_START = 0;   // 12 AM
  const HOUR_END = 24;    // 12 AM next day
  const totalHeight = (HOUR_END - HOUR_START) * HOUR_HEIGHT;

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START);

  const now = new Date();
  const isToday_ = isToday(selectedDay);
  const currentMinuteOffset = isToday_ 
    ? now.getHours() * 60 + now.getMinutes() 
    : -1;

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-3 px-1">
        {format(selectedDay, 'EEEE, MMMM d')}
      </h3>
      
      <div className="relative rounded-xl border border-border-subtle bg-bg-primary overflow-hidden" 
           style={{ height: totalHeight }}>
        {/* Hour rows */}
        {hours.map(hour => (
          <div 
            key={hour}
            className="absolute left-0 right-0 border-t border-border-subtle"
            style={{ top: (hour - HOUR_START) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
          >
            <span className="absolute -top-3 left-2 text-xs text-text-muted bg-bg-primary px-1">
              {format(new Date(2024, 0, 1, hour), 'h a')}
            </span>
          </div>
        ))}

        {/* Current time indicator */}
        {currentMinuteOffset >= 0 && (
          <div 
            className="absolute left-0 right-0 z-10 pointer-events-none"
            style={{ top: (currentMinuteOffset / 60) * HOUR_HEIGHT }}
          >
            <div className="absolute left-12 right-0 border-t-2 border-red-500" />
            <div className="absolute -left-0.5 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
          </div>
        )}
      </div>
    </div>
  );
}
```

Don't forget to add `isToday` to the imports if not already destructured in the outer component. Since `isToday` is already imported at the top of CalendarView.tsx, and DayView is a standalone function, either pass it as a prop or import it directly. Easiest: add at the top:

```typescript
// Already imported in CalendarView.tsx: isToday from date-fns
```

Actually, `isToday` is already imported at line 6. The standalone function can reference module-level imports.

**Step 2: Build and verify**

```bash
cd /Users/dcplaskett/MyServer/the-docket && npm run build
```

Expected: Clean build with time grid visible.

**Step 3: Commit**

```bash
git add src/components/CalendarView.tsx
git commit -m "feat: time-slot grid with hour labels and current time indicator"
```

---

### Task 4: Position events on the time grid

**Objective:** Render event blocks at the correct vertical positions based on start/end times.

**Files:**
- Modify: `src/components/CalendarView.tsx` (DayView function)

**Step 1: Add event positioning logic**

Inside DayView, after filtering events, add positioning:

```tsx
const positionedEvents = dayEvents
  .filter(e => !isTrulyAllDay(e)) // All-day events handled separately
  .map(e => {
    const start = new Date(e.start_time);
    const end = new Date(e.end_time);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const durationMinutes = Math.max(endMinutes - startMinutes, 15); // Min 15min height
    
    return {
      ...e,
      top: (startMinutes / 60) * HOUR_HEIGHT,
      height: (durationMinutes / 60) * HOUR_HEIGHT,
    };
  });
```

**Step 2: Render positioned events**

Add event blocks inside the grid container, after the hour rows:

```tsx
{/* Event blocks */}
{positionedEvents.map(event => {
  const colors = eventColorStyle(event.calendar_color);
  return (
    <div
      key={`evt-${event.id}`}
      onClick={() => onEventClick?.(event)}
      className="absolute left-12 right-1 z-10 rounded px-2 py-1 border cursor-pointer hover:opacity-80 overflow-hidden"
      style={{
        top: event.top,
        height: event.height,
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
        color: colors.color,
      }}
    >
      <div className="text-xs font-medium truncate">{event.title}</div>
      {event.height > 40 && (
        <div className="text-[10px] opacity-75">
          {format(new Date(event.start_time), 'h:mm a')} – {format(new Date(event.end_time), 'h:mm a')}
        </div>
      )}
    </div>
  );
})}
```

**Step 3: Handle all-day events**

Render all-day events in a separate row above the time grid:

```tsx
{/* All-day events */}
{dayEvents.filter(e => isTrulyAllDay(e)).length > 0 && (
  <div className="flex flex-wrap gap-1.5 mb-2">
    {dayEvents.filter(e => isTrulyAllDay(e)).map(e => {
      const colors = eventColorStyle(e.calendar_color);
      return (
        <div
          key={`allday-${e.id}`}
          onClick={() => onEventClick?.(e)}
          className="px-2 py-1 rounded text-xs border cursor-pointer hover:opacity-80"
          style={{ backgroundColor: colors.backgroundColor, borderColor: colors.borderColor, color: colors.color }}
        >
          {e.title}
        </div>
      );
    })}
  </div>
)}
```

**Step 4: Build and verify**

```bash
cd /Users/dcplaskett/MyServer/the-docket && npm run build
```

Expected: Events positioned on grid by time. All-day events in a row above.

**Step 5: Commit**

```bash
git add src/components/CalendarView.tsx
git commit -m "feat: position events on time grid with all-day event row"
```

---

### Task 5: Add drag-and-drop (desktop)

**Objective:** Make event blocks draggable via HTML5 drag API, updating position on drop.

**Files:**
- Modify: `src/components/CalendarView.tsx` (DayView function)

**Step 1: Add state for drag operation**

At the top of DayView:
```tsx
const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
const [dragOffset, setDragOffset] = useState(0); // px offset from event top during drag
```

**Step 2: Make event blocks draggable**

Update the event block div:
```tsx
<div
  key={`evt-${event.id}`}
  draggable
  onDragStart={(e) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(event.id));
    // Calculate drag offset from mouse position within the event
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset(e.clientY - rect.top);
  }}
  onDragEnd={() => {
    setDraggedEvent(null);
    setDragOffset(0);
  }}
  onClick={() => onEventClick?.(event)}
  className={`absolute left-12 right-1 z-10 rounded px-2 py-1 border cursor-pointer overflow-hidden ${
    draggedEvent?.id === event.id ? 'opacity-50' : 'hover:opacity-80'
  }`}
  ...
>
```

**Step 3: Add drop zone on the grid container**

On the outer grid `<div>`, add:
```tsx
<div 
  className="relative rounded-xl border border-border-subtle bg-bg-primary overflow-hidden"
  style={{ height: totalHeight }}
  onDragOver={(e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }}
  onDrop={(e) => {
    e.preventDefault();
    if (!draggedEvent) return;
    
    const gridRect = e.currentTarget.getBoundingClientRect();
    const dropY = e.clientY - gridRect.top - dragOffset;
    const dropMinutes = Math.round((dropY / HOUR_HEIGHT) * 60 / 15) * 15; // Snap to 15min
    const clampedMinutes = Math.max(0, Math.min(dropMinutes, 24 * 60));
    
    const durationMinutes = (() => {
      const start = new Date(draggedEvent.start_time);
      const end = new Date(draggedEvent.end_time);
      return Math.max((end.getTime() - start.getTime()) / 60000, 15);
    })();
    
    const newStart = new Date(selectedDay);
    newStart.setHours(Math.floor(clampedMinutes / 60), clampedMinutes % 60, 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMinutes * 60000);
    
    // Call API to update
    fetch(`/api/v2/calendar/events/${draggedEvent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        start_time: newStart.toISOString(), 
        end_time: newEnd.toISOString() 
      }),
    }).then(res => {
      if (res.ok) {
        // Optimistic update: move event visually
        // Trigger parent re-fetch or set local state
      }
    }).catch(err => console.error('Failed to update event time:', err));
    
    setDraggedEvent(null);
    setDragOffset(0);
  }}
>
```

**Step 4: Build and verify (desktop only for now)**

```bash
cd /Users/dcplaskett/MyServer/the-docket && npm run build
```

Expected: Clean build. Drag-and-drop works in desktop browser.

**Step 5: Commit**

```bash
git add src/components/CalendarView.tsx
git commit -m "feat: HTML5 drag-and-drop for event rescheduling on day view"
```

---

### Task 6: Add touch drag-and-drop (mobile)

**Objective:** Support touch-based drag on mobile devices since HTML5 drag doesn't work with touch.

**Files:**
- Modify: `src/components/CalendarView.tsx` (DayView function)

**Step 1: Add touch drag state**

Replace the simple `draggedEvent` state with a richer drag state:
```tsx
const [dragState, setDragState] = useState<{
  event: CalendarEvent | null;
  offsetY: number;
  isDragging: boolean;
  mode: 'mouse' | 'touch';
}>({ event: null, offsetY: 0, isDragging: false, mode: 'mouse' });
```

**Step 2: Add touch handlers to event blocks**

Add to each event block div:
```tsx
onTouchStart={(e) => {
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    setDragState({
      event,
      offsetY: touch.clientY - rect.top,
      isDragging: true,
      mode: 'touch',
    });
    e.preventDefault(); // Prevent scroll
  }
}}
onTouchMove={(e) => {
  if (dragState.isDragging && dragState.mode === 'touch') {
    e.preventDefault();
  }
}}
onTouchEnd={() => {
  if (dragState.isDragging && dragState.mode === 'touch') {
    // Calculate drop position from last known touch position
    // ... (similar to onDrop logic)
    setDragState({ event: null, offsetY: 0, isDragging: false, mode: 'touch' });
  }
}}
```

Note: For touch, we need to track the last touch position. Use a ref:
```tsx
const lastTouchY = useRef(0);
```

On touch move, update `lastTouchY`. On touch end, use it to calculate drop position.

**Step 3: Build and verify**

```bash
cd /Users/dcplaskett/MyServer/the-docket && npm run build
```

Expected: Clean build. Drag works on mobile touch.

**Step 4: Commit**

```bash
git add src/components/CalendarView.tsx
git commit -m "feat: touch drag-and-drop support for mobile day view"
```

---

### Task 7: Optimistic UI + re-fetch on change

**Objective:** After a successful drag, update the UI immediately and re-fetch events from the parent.

**Files:**
- Modify: `src/components/CalendarView.tsx`

**Step 1: Pass a refresh callback to DayView**

In CalendarViewV2, where DayView is rendered:
```tsx
<DayView 
  selectedDay={selectedDay}
  events={events}
  tasks={tasks}
  onEventClick={handleEventClick}
  onEventMoved={() => fetchData()}
/>
```

**Step 2: Call onEventMoved after successful PATCH**

In DayView's drop handler, after the fetch resolves:
```tsx
.then(res => {
  if (res.ok) onEventMoved?.();
}).catch(...)
```

**Step 3: Build, run tests, deploy**

```bash
cd /Users/dcplaskett/MyServer/the-docket && npm run build && npm test
```

**Step 4: Final commit**

```bash
git add src/components/CalendarView.tsx src/pages/api/v2/calendar/events/[id].ts
git commit -m "feat: optimistic UI + parent re-fetch after event drag"
```

---

## Summary

| Task | Files | Key Change |
|---|---|---|
| 1 | `api/v2/calendar/events/[id].ts` (new) | PATCH endpoint with ICAL update → CalDAV push |
| 2 | `CalendarView.tsx` | ViewType extended: `'week' \| 'month' \| 'day'`, Day button |
| 3 | `CalendarView.tsx` | Hour grid with labels + current time indicator |
| 4 | `CalendarView.tsx` | Event positioning by start/end time, all-day row |
| 5 | `CalendarView.tsx` | HTML5 drag-and-drop on desktop |
| 6 | `CalendarView.tsx` | Touch drag-and-drop on mobile |
| 7 | `CalendarView.tsx` | Optimistic update + parent re-fetch |

## Risks & Tradeoffs

- **CalDAV sync latency**: Updates push immediately, but other clients (Google Calendar) may take seconds to reflect. Local DB updates are instant.
- **Concurrent edits**: If Dave edits on phone and desktop simultaneously, last write wins (standard CalDAV behavior).
- **15-minute snap**: Events snap to 15-minute grid on drop. Fine for most use cases. Could be configurable later.
- **Touch drag UX**: Touch dragging on a scrollable page requires `preventDefault` to stop page scroll. The grid itself doesn't scroll vertically (fixed height), so this is fine.
- **No new dependencies**: Using HTML5 drag + native touch events. `@dnd-kit` would be nicer but adds ~30KB to bundle.
