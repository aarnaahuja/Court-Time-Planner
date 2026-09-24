---
name: ReUI Gantt compatibility
description: Intraday Gantt scale and UI-primitive compatibility in a Radix-based app.
---

ReUI's Gantt block examples may default to a month view, but the underlying **day** scale supports hourly and finer intervals. The scale enum does not need a separate `hour` value to place events at precise intraday times.

**Why:** The registry example's month-scale demo was misleading for a court timetable. Its generated Gantt also combined Base UI scroll-area content and trigger conventions with an existing Radix-based shadcn app. TypeScript did not catch the scroll-area context mismatch; a browser preview did.

**How to apply:** When reusing another ReUI block here, inspect its underlying view configuration rather than inferring capability from the demo. Align generated composition patterns with the app's UI primitives and confirm the result in a running browser after typechecking.

For a finite intraday window, the header units, event positions, and drag-coordinate math must all use the same visible range. The Gantt width metric applies to each displayed interval, **not** always to an hour.

**Why:** Cropping only the state range made bars appear several hours away from their header times; switching from hourly to half-hour ticks without reducing the unit width doubled the visual zoom.

**How to apply:** When changing the visible window or tick interval, check a known hearing's start against its header in the browser and repeat a same-day drag. Scale the width per tick to keep the intended pixels per hour.