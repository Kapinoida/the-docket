# The Docket — Mobile UX Audit & Plan

## What's Working ✅
- **PWA foundation** — manifest.json, standalone display, PwaRegister, apple-mobile-web-app-capable — all solid
- **Sidebar overlay pattern** — slide-in hamburger menu with backdrop is the right approach
- **RightSidebar full-width on mobile** — good instinct
- **Dashboard responsive grid** — `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` is correct
- **Quick-add inputs** — TodayView autoFocus is great for mobile "just start typing"

## What Needs Work ⚠️

### 1. Navigation — No Bottom Tab Bar
Desktop has the sidebar. Mobile has… a hamburger menu. That's two taps for every navigation action. A **bottom tab bar** with 4-5 key destinations (Today, Inbox, Dashboard, All Tasks) is the standard mobile pattern. Hamburger stays for Files, Tags, Settings.

### 2. Touch Targets Too Small
| Element | Current | Minimum |
|---|---|---|
| Task checkbox | ~20px | 44px |
| Date badge button | `text-[10px]` tiny | 44px |
| Edit button | `opacity-0` hover-only | 44px + always visible |
| Settings button | ~16px icon | ok in footer |

### 3. Hover-Only Interactions Break on Touch
`group-hover:opacity-100` — the edit button, date "add" button, delete button, section "+" buttons are invisible to thumbs. Need to show them always on mobile or use an active state.

### 4. Font Sizes
- Date badge: `text-[10px]` — illegible. Should be `text-xs` (12px).
- Page context badge same problem.
- Overall: body text is fine at `text-sm`, headers at `text-2xl`/`text-3xl` could be `text-xl`/`text-2xl` on mobile.

### 5. Spacing & Padding
- Dashboard: `p-8` → should be `p-4` or `px-4 py-6` on mobile
- TodayView: `mx-auto p-8` → `p-4`
- Stats cards: `p-6` → `p-4` on mobile
- Headers are huge — `text-3xl` with icon blocks and subtitle text.

### 6. WeeklyCalendar on Mobile
7 columns with `min-w-[140px]` = 980px minimum. On a 375px phone this is a horizontal scroll. Better: compact 5-day view that fits, or a swipeable week carousel.

### 7. Safe Area Insets (iOS PWA)
No `env(safe-area-inset-bottom)` handling. In standalone mode, the iOS home indicator overlaps content at the bottom. Need `pb-safe` padding on bottom nav / footer.

### 8. Daily Journal Editor
TipTap on mobile is… heavy. The toolbar, the formatting buttons, the slash commands — designed for desktop. Mobile TipTap needs larger touch targets in the toolbar and the floating menu.

### 9. Swipe Gestures
No swipe-to-close on sidebars. iOS PWA users expect swipe-back from the left edge. A simple touch-drag or swipe-right gesture on the sidebar overlay would feel native.

---

## Proposed Implementation: 3 Passes

### Pass 1: Foundation (high impact, low risk)
- **Bottom tab bar** — 4 icons: Today | Inbox | Dashboard | Tasks. Uses `fixed bottom-0` on mobile only.
- **Safe area padding** — Add `pb-[env(safe-area-inset-bottom,16px)]` to bottom nav and layout
- **Touch targets** — Bump checkbox to 44px, date badge to 44px min-height, `text-xs` instead of `text-[10px]`
- **Spacing** — Add `px-4 py-6` mobile variants to Dashboard, TodayView, AllTasksView
- **Show hover-only controls on mobile** — Add `md:opacity-0 md:group-hover:opacity-100` instead of just `group-hover:`

### Pass 2: Calendar & Navigation Polish
- **WeeklyCalendar mobile layout** — Single-column compact list of days instead of 7-column grid
- **Sidebar swipe-to-close** — Simple touch-move-right > 80px = close
- **Header compaction** — Reduce `text-3xl` → `text-xl` on mobile, shrink icon blocks
- **TaskItem mobile refinements** — Stack content vertically if needed, expand hit areas

### Pass 3: Editor & Advanced
- **TipTap mobile toolbar** — Larger touch targets, simplified toolbar on mobile
- **Pull-to-refresh** — Swipe down on Today/Inbox to refresh tasks
- **Long-press context menu** — Long press a task → edit/delete/move quick actions
