---
name: Court schedule move semantics
description: How visual schedule changes relate to planner-owned hearing times.
---

Treat a drag in the cause-list timetable as a **proposed listing-order change**, not a fixed appointment time. Validate the resulting preview before recording a local override or announcing success. Use the case detail control for moving to another sitting day.

**Why:** The planner owns exact start/end times and may recalculate them or reject a forced move. A Gantt bar can visually suggest a timestamp that the current move contract cannot store.

**How to apply:** Any new schedule interaction must be explicit about what persists. Display the planner's recomputed result, and keep rejected proposals out of saved preview overrides.