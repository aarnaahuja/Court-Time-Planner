---
name: Court process signals
description: Interpretation of defect confidence, scheduling holds, and latest-hearing data in Court Time Planner.
---

Treat the absence of a defect warning as “no warning found,” not verified readiness. The latest-hearing value is narrative case history, not a calendar date. Only record-based court-side defects should be provisional automatic listing holds; advocate-side flags warn but do not block, and stage risk alone must not hold a case. A hold is not a verified legal disqualification.

**Why:** The roster has last-hearing summaries and hearing-type patterns, but no verified service or report status. Treating a stage-wide risk as a case-specific bar, presenting an inferred flag as definitive, or formatting narrative text as a date can mislead a court user.

**How to apply:** In case views, filters, exports, and scheduling explanations, show each defect's confidence and keep warnings provisional. Never list a provisionally held case and label it held in the same preview. Render the latest-hearing value as text unless a separate verified date field is available.