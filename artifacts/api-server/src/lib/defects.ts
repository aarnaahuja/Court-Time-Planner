type Row = Record<string, string>;

export type DefectCode = "PROCESS_PENDING" | "EXTERNAL_WAIT" | "PARTY_ABSENT" | "NOT_READY" | "TIME_SOUGHT" | "REPEAT_ADJOURNED";
export type Defect = {
  code: DefectCode;
  confidence: "record" | "likely" | "stage_risk";
  evidence: string;
  owner: "court_staff" | "agency" | "advocate" | "judge";
  clears_when: string;
  limitedData: boolean;
  stuck: boolean;
};

const definitions: Record<DefectCode, Pick<Defect, "owner" | "clears_when">> = {
  PROCESS_PENDING: { owner: "court_staff", clears_when: "Summons or warrant return confirmed by court staff" },
  EXTERNAL_WAIT: { owner: "agency", clears_when: "Outside report received and recorded" },
  PARTY_ABSENT: { owner: "advocate", clears_when: "Required party's attendance confirmed" },
  NOT_READY: { owner: "advocate", clears_when: "Evidence or filing prepared" },
  TIME_SOUGHT: { owner: "advocate", clears_when: "Advocate confirms readiness to proceed" },
  REPEAT_ADJOURNED: { owner: "judge", clears_when: "Judge or court master reviews the repeated adjournments" },
};

const normalize = (value: string) => value.trim().toUpperCase().replace(/[\s-]+/g, "_");
const failureColumns: [string, DefectCode][] = [
  ["Awaiting Process / Summons / Warrant Return", "PROCESS_PENDING"],
  ["External Dependency", "EXTERNAL_WAIT"],
  ["Respondent Absence / Non-Compliance", "PARTY_ABSENT"],
  ["Petitioner Absence / Non-Compliance", "PARTY_ABSENT"],
  ["Both Parties Unready / Absent", "PARTY_ABSENT"],
  ["Evidence / Filing Not Ready", "NOT_READY"],
  ["Party Sought Time / Adjournment", "TIME_SOUGHT"],
];

export function classifyDefects(row: Row, failures: Row[], references: Row[]): Defect[] {
  const purpose = normalize(row.purpose_of_next_hearing || "");
  const lines = (row.last_hearing_summary || "").split(/\r?\n/);
  const absent = lines.find(line => /^\s*Absent:/i.test(line))?.replace(/^\s*Absent:\s*/i, "").trim() || "";
  const order = lines.filter(line => !/^\s*(Present|Absent):/i.test(line)).join(" ").trim();
  const sentence = (match: RegExp) => order.split(/(?<=[.!?])\s+/).find(part => match.test(part)) || order;
  const result: Defect[] = [];
  const add = (code: DefectCode, confidence: Defect["confidence"], evidence: string, extra: Partial<Pick<Defect, "stuck" | "limitedData">> = {}) => {
    result.push({ code, confidence, evidence, ...definitions[code], limitedData: extra.limitedData ?? false, stuck: extra.stuck ?? false });
  };

  const process = /\b(?:NBW|BW|issue warrant|return of warrant|issue summons|take steps|notice|unserved)\b/i;
  if (["APPEARANCE", "WARRANT", "ADMISSION", "COGNIZANCE"].includes(purpose) && process.test(order))
    add("PROCESS_PENDING", "record", sentence(process));

  const external = /\b(?:mediation|report|awaited)\b/i;
  if (external.test(order) || purpose === "REPORTS")
    add("EXTERNAL_WAIT", "record", external.test(order) ? sentence(external) : `Next hearing: ${row.purpose_of_next_hearing}`);

  const accusedAbsent = /\bAccused\b(?!\s+Advocate)/i.test(absent);
  const complainantAbsent = /\bComplainant\b(?!'s\s+Advocate)/i.test(absent);
  const bothAdvocatesAbsent = /Complainant's Advocate/i.test(absent) && /Accused Advocate/i.test(absent);
  const absencePhrase = /\b(?:continuously absent|absent despite|last chance)\b/i;
  const neededAccused = ["APPEARANCE", "WARRANT", "PLEA", "EXAMINATION_UNDER_S351_BNSS", "EVIDENCE_ACCUSED"].includes(purpose);
  if ((neededAccused && accusedAbsent) || (purpose === "EVIDENCE_COMPLAINANT" && complainantAbsent) || bothAdvocatesAbsent || absencePhrase.test(order))
    add("PARTY_ABSENT", "record", absencePhrase.test(order) ? sentence(absencePhrase) : `Absent: ${absent}`);
  else if (accusedAbsent && complainantAbsent)
    add("PARTY_ABSENT", "likely", `Absent: ${absent}`);

  const notReady = /\b(?:not ready|for cross|witness schedule|issue summons to witness|further evidence)\b/i;
  if (notReady.test(order)) add("NOT_READY", "record", sentence(notReady));
  const timeSought = /\b(?:time sought|adjourned|last chance|seeks time)\b/i;
  if (timeSought.test(order)) add("TIME_SOUGHT", "record", sentence(timeSought));

  const reference = references.find(r => normalize(r["Hearing Purpose"] || "") === purpose);
  const count = Number(row[`hearings_${purpose.toLowerCase()}`]);
  const median = Number(reference?.["Median Hearings per Case"]);
  const maximum = Number(reference?.["Max Hearings per Case"]);
  const stuck = Number.isFinite(count) && count >= 5 && maximum > 0 && count >= .6 * maximum;
  if (reference && Number.isFinite(count) && ((count >= 3 && median > 0 && count >= 2 * median) || stuck))
    add("REPEAT_ADJOURNED", "likely", `${count} hearings at this stage; median ${median}, reference maximum ${maximum}.`, { stuck });

  if (!result.length) {
    const failure = failures.find(r => normalize(r.hearingType || "") === purpose);
    if (failure) {
      const total = Number(failure.total_no);
      const top = [...failureColumns].sort((a, b) => Number(failure[b[0]]) - Number(failure[a[0]]))[0];
      if (top && total > 0 && Number(failure[top[0]]) / total >= .4)
        add(top[1], "stage_risk", `Common at this next-hearing stage; no case-specific warning found.`, { limitedData: /^estimated/i.test(failure.source || "") });
    }
  }

  const ownerRank = { court_staff: 0, agency: 1, advocate: 2, judge: 3 };
  const confidenceRank = { record: 0, likely: 1, stage_risk: 2 };
  return result.sort((a, b) => ownerRank[a.owner] - ownerRank[b.owner] || confidenceRank[a.confidence] - confidenceRank[b.confidence]);
}

export const isCourtHold = (defect: Defect) =>
  defect.confidence === "record" && (defect.code === "PROCESS_PENDING" || defect.code === "EXTERNAL_WAIT");