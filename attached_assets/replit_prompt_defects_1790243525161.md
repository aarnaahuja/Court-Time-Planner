# Replit prompt: flag defects in the Roster section

Update the **Roster** screen so every case shows *what is likely to stop its next hearing from moving forward* (a "defect"), why we think so, and what needs to happen to clear it. Keep the current layout: the stat tabs at the top, Filters / Actions / Sort, and cases grouped by stage in collapsible cards. The users are judges and court masters. Use plain language, icon + label on every flag, and no percentages or model terms.

## 1. Defect types (replace the single "To confirm" flag)

Use these six defect types. They follow the failure reasons in `hearing_failure_reasons.csv`.

| Code | Label shown to the user | Icon | Who must act | Covers these CSV columns |
|---|---|---|---|---|
| `PROCESS_PENDING` | Summons / warrant not returned | ✉️ envelope-clock | Court staff / police | Awaiting Process / Summons / Warrant Return |
| `EXTERNAL_WAIT` | Waiting on outside report | 🏛️ building | Mediation centre / other agency | External Dependency |
| `PARTY_ABSENT` | Party likely absent | 👤 person-slash | Advocate | Respondent Absence, Petitioner Absence, Both Parties Unready / Absent |
| `NOT_READY` | Evidence / filing not ready | 📄 file-alert | Advocate | Evidence / Filing Not Ready |
| `TIME_SOUGHT` | Likely to seek adjournment | ⏱️ timer | Advocate | Party Sought Time / Adjournment |
| `REPEAT_ADJOURNED` | Adjourned repeatedly at this stage | 🔁 repeat | Judge / court master | Derived from hearing counts |

`Court Administrative Issue`, `Court Holiday` and `Unclear` are court-side or unknown, so **don't** flag them on individual cases.

## 2. How to detect each defect (backend, Python)

Each flag has a **confidence level**, shown as a small text tag next to the chip, not as a colour alone:

- **From record:** the last hearing's order text says so. Show the quoted phrase.
- **Likely:** inferred from the case's history.
- **Stage risk:** common for cases at this stage in the court's data, but nothing specific in this case.

**Rules. Run them on each roster row.**

Parse `last_hearing_summary`. It has lines like `Present: ...`, `Absent: ...`, then the order text. Match case-insensitively.

- **`PROCESS_PENDING` · From record**
  - Order text contains `NBW`, `BW`, `issue warrant`, `return of warrant`, `issue summons`, `take steps`, `notice` or `unserved`
  - **and** `purpose_of_next_hearing` is one of Appearance, Warrant, Admission or Cognizance
- **`EXTERNAL_WAIT` · From record**
  - Order text contains `mediation`, `report` or `awaited`
  - **or** `purpose_of_next_hearing` = Reports
- **`PARTY_ABSENT`**
  - **From record:** the `Absent:` line lists the party whose presence the *next* hearing needs:
    - Accused → Appearance, Warrant, Plea, Examination u/s 351, Evidence Accused
    - Complainant → Evidence Complainant
    - Both advocates → any stage
  - **From record:** the text also says `continuously absent`, `absent despite` or `last chance`
  - **Likely:** both the complainant and the accused are listed as absent, whatever the stage
- **`NOT_READY` · From record**
  - Order text contains `not ready`, `for cross`, `witness schedule`, `issue summons to witness` or `further evidence`
- **`TIME_SOUGHT` · From record**
  - Order text contains `time sought`, `adjourned`, `last chance` or `seeks time`
- **`REPEAT_ADJOURNED` · Likely**
  - The hearing count for the current purpose (`hearings_<purpose>` column) is at least **2× the median** for that type in `hearing_type_reference.csv`, and at least 3 hearings
  - Say "Stuck" instead if the count is at least **60% of the max** for that type and at least 5 hearings
- **Stage risk (fallback)**
  - If a case has no specific flag, attach the **top defect for its next-hearing type** from `hearing_failure_reasons.csv`, but only when that reason is **≥ 40%** of that type's failures. Currently that means:
    - Admission / Cognizance / Warrant → Process pending
    - Reports → Waiting on outside report
    - Evidence Accused → Not ready
    - Arguments → Likely to seek adjournment
    - Plea → Party absent
  - Label it **Stage risk**, in a lighter style.
  - Rows the CSV marks as `estimated` get the tooltip "Based on limited data".

A case can have several flags. Sort them by who must act (court first, then advocate), then by confidence.

Expose this as `GET /cases?include=defects`. Each case gets:

```json
"defects": [
  {"code": "PROCESS_PENDING", "confidence": "record",
   "evidence": "Issue NBW to accused. Take steps. For return of warrant.",
   "owner": "court_staff", "clears_when": "Warrant returned served"}
]
```

## 3. Roster screen changes

**Stat tabs.** Replace "No process warning / Process to confirm" with clickable tabs that also filter the list:

- Total cases
- **Ready to list** (no record or likely defects)
- **Court side** (process pending + outside report)
- **Advocate side** (absent, not ready, seeking time)
- **Stuck / repeat adjournments**
- Older cases · 4+ years

**Stage group header.** Next to "4 cases", show a **mini stacked bar**, about 80px wide, of that group's defects by type, plus a text summary like "2 process pending · 1 party absent". Keep a red pill only for groups where *more than half* the cases are blocked.

**Case row.** Replace the single "To confirm" pill with **up to 2 defect chips** (icon + short label + confidence tag), then "+N" if there are more. Chip styles:

- **From record:** solid tinted background
- **Likely:** outlined
- **Stage risk:** dashed outline, muted text

Add a small status dot at the left of the row:

- 🟢 **Ready to list**
- 🟠 **Needs advocate action**
- 🔴 **Blocked by process**

Always show the dot with a text tooltip; never rely on colour alone.

**Fix the label mismatch.** Groups are by current stage, but the subtitle shows the *next hearing's* purpose (for example, a "Delay Condonation Hearing" case sits under Admission). Show the subtitle as **"Next hearing: Delay condonation"**, so it's clear.

**Filters.** Add a Defect filter (multi-select by type), a Confidence filter, and "Who must act" (Court staff / Advocate / Judge).

**Case drawer** (clicking the chevron opens a right-side drawer):

- Case header: number, party, advocate, age, current stage, next hearing
- **"What could stop the next hearing"**: each defect as a card with:
  - icon, label, confidence
  - the **quoted order text** with the matching words highlighted
  - who must act, and what clears it (e.g. "Clears when the warrant is returned served")
- **Hearing history strip:** one small block per past hearing at each stage, so a long run of adjournments is visible at a glance
- **Actions** for the court master:
  - **Confirm**: keeps the flag and marks it "Confirmed by court master"
  - **Clear**: the defect is resolved; ask for an optional note, and the case becomes Ready to list
  - **Not applicable**: dismiss an inferred flag
  - **Remind advocate**: a stub that shows an SMS/WhatsApp preview listing what they must file or who must attend

  Log every action with the user and time.

**Bulk actions.** Add these to the Actions menu when rows are selected: *Confirm selected*, *Clear selected*, *Remind advocates of selected*. For example, select all "Summons / warrant not returned" rows and ask the police station for a status update.

**Defect map view.** Add a toggle next to "grouped by stage": **List | Defect map**.

- The Defect map is a grid: rows are stages in lifecycle order, columns are the 6 defect types, and cells are the count of cases in *this* roster.
- Shade cells with one blue ramp (light = few, dark = many). Show the number in every cell.
- Clicking a cell filters the list to those cases.
- Under the grid, add a one-line caption with the biggest cell, e.g. "Most blocked: 34 Warrant cases waiting on warrant return."

## 4. How defects feed the cause list

- Cases with a **From record** or **Confirmed** `PROCESS_PENDING` / `EXTERNAL_WAIT` flag are **not listed**. They appear in the Cause List screen's "Not today" lane with the reason, and move back to "Ready" when cleared.
- Cases with advocate-side flags **can** be listed, but show a warning icon on their timeline bar. Their "likely to go ahead" drops one level.
- Clearing a defect in the roster updates the cause-list preview right away.

## 5. Done when

- Every roster row shows specific, labelled reasons instead of a generic "To confirm", and each reason can be traced to a quoted order line or the stage's history.
- A court master can filter to "Blocked by process", select them all, and confirm or clear them in bulk.
- The Defect map shows where this roster is stuck, and clicking a cell opens those cases.
- Clearing a defect changes that case's status on both the roster and the cause list.
