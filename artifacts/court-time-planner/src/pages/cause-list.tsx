import { useEffect, useState, useMemo, useRef } from "react";
import { usePreviewSchedule, useGetRules, useGetLeave, useGetScheduleImpact, type ScheduledCase, type HeldCase } from "@workspace/api-client-react";
import { useScheduleContext } from "@/store/schedule-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Play, FileText, Clock, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { format, isValid } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { DefectChip, DefectDetails } from "@/components/defect-chip";

const toMinutes = (time: string) => { const [h,m] = time.split(":").map(Number); return h * 60 + m; };
function timeToPercent(time: string, start: number, end: number) {
  if (!time) return 0;
  return Math.max(0, Math.min(100, ((toMinutes(time) - start) / Math.max(1, end - start)) * 100));
}

function LikelihoodDots({ level }: { level: string }) {
  const dots = level === 'High' ? 3 : level === 'Medium' ? 2 : 1;
  return (
    <div className="flex gap-0.5 mt-0.5">
      {[1, 2, 3].map(i => (
        <div 
          key={i} 
          className={`w-1.5 h-1.5 rounded-full ${i <= dots ? 'bg-current' : 'bg-current/30'}`} 
        />
      ))}
    </div>
  );
}

const getDefects = (item: ScheduledCase | HeldCase) => item.defects ?? [];

export default function CauseListPage() {
  const { startDate, setStartDate, period, setPeriod, moves, addMove, removeMove } = useScheduleContext();
  const { data: rules, isLoading: rulesLoading } = useGetRules();
  const { data: settings } = useGetLeave();
  const previewMutation = usePreviewSchedule();
  const impactMutation = useGetScheduleImpact();
  const impactMutateFn = useRef(impactMutation.mutate);
  impactMutateFn.current = impactMutation.mutate;
  const { toast } = useToast();

  const [selectedDay, setSelectedDay] = useState<string>(startDate);
  const [selectedCase, setSelectedCase] = useState<ScheduledCase | null>(null);
  const [moveDate, setMoveDate] = useState<string>("");
  const [moveNote, setMoveNote] = useState("");
  const [showAllHeld, setShowAllHeld] = useState(false);
  const [showAllDefects, setShowAllDefects] = useState(false);
  const dragging = useRef<string | null>(null);
  const previewKey = useRef("");
  const requestedKey = JSON.stringify({ rules, startDate, period, moves });

  useEffect(() => {
    if (rules && requestedKey !== previewKey.current) {
      previewKey.current = requestedKey;
      previewMutation.mutate({
        data: {
          period,
          start_date: startDate,
          rules,
          moves,
        }
      }, {
        onSuccess: data => {
          if (data.days.length && !data.days.some(d => d.date === selectedDay)) setSelectedDay(data.days[0].date);
        }
      });
    }
  }, [requestedKey]);

  const preview = previewMutation.data;
  
  useEffect(() => {
    if (rules && preview && moves.length > 0) {
      impactMutateFn.current({
        data: {
          proposed_schedule: { rules, start_date: startDate, period },
          moves
        }
      });
    }
  }, [moves, rules, startDate, period, preview]);

  useEffect(() => {
    if (selectedCase) {
      const existingMove = moves.find(m => m.caseId === selectedCase.caseId);
      setMoveDate(existingMove ? existingMove.date : selectedDay);
      setMoveNote(existingMove?.note || "");
    }
  }, [selectedCase, moves, selectedDay]);

  const handleGenerate = () => {
    if (!rules) return;
    previewMutation.mutate({
      data: {
        period,
        start_date: startDate,
          rules,
          moves,
      }
    }, {
      onSuccess: (data) => {
        if (data.days.length > 0) setSelectedDay(data.days[0].date);
        toast({ title: "Schedule Generated", description: "The cause list preview has been updated." });
      }
    });
  };

  const dayInfo = preview?.days.find(d => d.date === selectedDay);
  
  const displayCases = useMemo(() => {
    if (!dayInfo) return [];
    return dayInfo.cases;
  }, [dayInfo]);
  const casesWithDefects = displayCases.filter(c => getDefects(c).length > 0);

  const casesByAdvocate = useMemo(() => {
    const grouped: Record<string, ScheduledCase[]> = {};
    displayCases.forEach(c => {
      if (!grouped[c.advocateId]) grouped[c.advocateId] = [];
      grouped[c.advocateId].push(c);
    });
    return grouped;
  }, [displayCases]);

  if (rulesLoading) return <div className="workspace-page p-8"><Skeleton className="h-[400px] w-full" /></div>;

  const axisStart = toMinutes(settings?.morningStart || "10:00");
  const axisEnd = toMinutes(settings?.afternoonEnd || "17:30");
  const lunchStart = settings?.morningEnd || "13:30";
  const lunchEnd = settings?.afternoonStart || "14:00";
  const hours = Array.from({length: Math.ceil(axisEnd / 60) - Math.floor(axisStart / 60) + 1}, (_, i) => Math.floor(axisStart / 60) + i).filter(h => h * 60 >= axisStart && h * 60 <= axisEnd);
  const pct = (time: string) => timeToPercent(time, axisStart, axisEnd);
  const impact = impactMutation.data;
  const reasonLabel = (code: string) => ({
    OLD_CASE: "Older case", NEAR_DISPOSAL: "Close to a decision", SAME_ADVOCATE: "Same advocate",
    READY: "Ready for review", ENGINE_PRIORITY: "Engine priority", WAITING_WARRANT: "Process needs checking", DAY_FULL: "Day is full",
    CARRIED_OVER: "Carried forward", LEAVE_DAY: "Leave day",
    PROCESS_PENDING: "Summons / warrant not returned", EXTERNAL_WAIT: "Waiting on outside report",
  }[code] || "Scheduling reason");

  return (
    <div className="workspace-page space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="workspace-header flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="workspace-breadcrumb">Schedule / Cause list</div>
          <h1 className="workspace-title text-3xl font-bold">Cause List Preview</h1>
          <p className="workspace-subtitle text-muted-foreground mt-1">Review and adjust the generated schedule</p>
        </div>
        <div className="flex items-center gap-3">
          <Input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)}
            className="w-auto"
          />
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">1 Day</SelectItem>
              <SelectItem value="week">1 Week</SelectItem>
              <SelectItem value="month">1 Month</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={previewMutation.isPending} className="gap-2">
            <Play className="w-4 h-4" /> Generate
          </Button>
        </div>
      </div>

      {!preview && !previewMutation.isPending && (
        <Card className="p-12 text-center text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Click Generate to create a cause list preview for {startDate}</p>
        </Card>
      )}

      {previewMutation.isPending && (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {preview && !previewMutation.isPending && (
        <>
          {moves.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="w-4 h-4" /> 
                 {moves.length} manual move{moves.length > 1 ? 's' : ''} applied to this schedule. 
                  {impact && <span className="font-bold ml-2">{impact.extraTrips > 0 ? `${impact.extraTrips} advocates have a changed date` : impact.choice.unheard > impact.recommended.unheard ? `+${impact.choice.unheard - impact.recommended.unheard} simulated matters not reached` : "No additional impact estimated"}</span>}
              </div>
              <Button variant="outline" size="sm" className="h-8 bg-background" asChild>
                <Link href="/impact">Review Impact</Link>
              </Button>
            </div>
          )}

          {preview.days.length > 1 && (
            <div className="flex overflow-x-auto gap-3 pb-2 pt-2 hide-scrollbar">
              {preview.days.map(d => {
                const isSelected = d.date === selectedDay;
                return (
                  <button 
                    key={d.date}
                    onClick={() => setSelectedDay(d.date)}
                     onDragOver={e => e.preventDefault()}
                     onDrop={e => {
                       e.preventDefault();
                       if (dragging.current) {
                         addMove({ caseId: dragging.current, date: d.date, order: 0 });
                         dragging.current = null;
                         setSelectedDay(d.date);
                         toast({ title: "Case moved", description: `Moved to ${d.date}. Review the impact before finalising.` });
                       }
                     }}
                    className={`shrink-0 flex flex-col items-start p-3 rounded-xl border transition-all min-w-[120px] ${
                      isSelected ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card hover:bg-accent border-border'
                    }`}
                  >
                    <span className="text-sm font-semibold mb-2">{format(new Date(d.date), 'MMM d, EEE')}</span>
                    <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${isSelected ? 'bg-white' : 'bg-primary'}`} 
                        style={{ width: `${Math.min(100, d.fullness)}%` }} 
                      />
                    </div>
                    <span className="text-[10px] mt-1.5 opacity-80">{d.fullness}% full</span>
                  </button>
                )
              })}
            </div>
          )}

          {dayInfo && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-card p-4 rounded-xl border">
                <div>
                  <h2 className="text-xl font-bold">{format(new Date(dayInfo.date), 'EEEE, MMMM d')}</h2>
                  <p className="text-sm text-muted-foreground">{displayCases.length} cases scheduled • {dayInfo.fullness}% Full</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Longer, substantive matters are generally placed earlier. If the day runs late, shorter matters can be re-planned first. Appointment windows are estimates.</p>

              {casesWithDefects.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base"><AlertCircle className="h-4 w-4 text-amber-600" /> Listed with warnings <Badge variant="outline">{casesWithDefects.length}</Badge></CardTitle>
                    <p className="text-xs text-muted-foreground">These are not confirmed blockers. Advocate-side warnings lower the estimated likelihood by one level; open a case to review the evidence and next step.</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(showAllDefects ? casesWithDefects : casesWithDefects.slice(0, 4)).map(c => (
                      <button type="button" key={c.caseId} onClick={() => setSelectedCase(c)} className="flex w-full flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-left hover:bg-muted/40">
                        <span className="mr-1 text-sm font-medium text-primary">{c.caseId}</span>
                        {getDefects(c).slice(0, 2).map(d => <DefectChip key={d.code} defect={d} />)}
                        {getDefects(c).length > 2 && <span className="text-xs text-muted-foreground">+{getDefects(c).length - 2} more</span>}
                      </button>
                    ))}
                    {casesWithDefects.length > 4 && <button type="button" aria-expanded={showAllDefects} onClick={() => setShowAllDefects(value => !value)} className="text-xs font-medium text-primary hover:underline">{showAllDefects ? "Show fewer" : `Show all ${casesWithDefects.length} warned cases`}</button>}
                  </CardContent>
                </Card>
              )}

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    <div className="flex border-b sticky top-0 bg-muted/30 z-10">
                      <div className="w-48 shrink-0 border-r p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Advocate
                      </div>
                      <div className="flex-1 relative h-10">
                        {hours.map(h => (
                          <div 
                            key={h} 
                            className="absolute top-0 bottom-0 border-l border-border/50 px-1 pt-2 text-[10px] font-medium text-muted-foreground"
                            style={{ left: `${pct(`${h}:00`)}%` }}
                          >
                            {h}:00
                          </div>
                        ))}
                        {/* Lunch shading */}
                        <div 
                          className="absolute top-0 bottom-0 bg-muted/50 border-x border-border/50 flex items-center justify-center"
                          style={{ left: `${pct(lunchStart)}%`, width: `${pct(lunchEnd) - pct(lunchStart)}%` }}
                        >
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold hidden md:block">Lunch</span>
                        </div>
                      </div>
                    </div>

                    <div className="divide-y border-b">
                      {Object.entries(casesByAdvocate).map(([advocateId, advCases]) => (
                        <div key={advocateId} className="flex min-h-[4.5rem] hover:bg-muted/10 transition-colors group relative">
                          <div className="w-48 shrink-0 border-r p-3 text-sm font-medium flex items-center break-words">
                            {advocateId}
                          </div>
                          <div className="flex-1 relative py-2">
                            {/* Lunch shading continuation */}
                            <div 
                              className="absolute top-0 bottom-0 bg-muted/30 pointer-events-none"
                              style={{ left: `${pct(lunchStart)}%`, width: `${pct(lunchEnd) - pct(lunchStart)}%` }}
                            />
                            
                            {advCases.map(c => {
                              const left = pct(c.start);
                              const width = pct(c.end) - left;
                              
                              let colorClass = "bg-primary text-primary-foreground border-primary";
                              if (c.likelihood === 'Low') colorClass = "bg-background text-foreground border-border border-2";
                              else if (c.likelihood === 'Medium') colorClass = "bg-primary/20 text-foreground border-primary/30 border-2";

                              const hasMove = moves.some(m => m.caseId === c.caseId);
                              if (hasMove) colorClass += " ring-2 ring-amber-500 ring-offset-1";

                              return (
                                 <button
                                   type="button"
                                   draggable
                                   onDragStart={e => {
                                     dragging.current = c.caseId;
                                     e.dataTransfer.effectAllowed = "move";
                                     e.dataTransfer.setData("text/plain", c.caseId);
                                   }}
                                   onDragEnd={() => { dragging.current = null; }}
                                   onDragOver={e => e.preventDefault()}
                                   onDrop={e => {
                                     e.preventDefault();
                                     e.stopPropagation();
                                     const source = dragging.current;
                                     if (source && source !== c.caseId) {
                                       addMove({ caseId: source, date: selectedDay, order: Math.max(0, dayInfo.cases.findIndex(item => item.caseId === c.caseId)) });
                                       toast({ title: "Order changed", description: "Review its position and impact before finalising." });
                                     }
                                     dragging.current = null;
                                   }}
                                  key={c.caseId}
                                  onClick={() => setSelectedCase(c)}
                                   title={`${c.caseId} · ${c.purpose} · ${c.window} · ${c.likelihood} likely to go ahead${getDefects(c).length ? ` · ${getDefects(c).length} warning(s)` : ""}`}
                                   aria-label={`${c.caseId}, ${c.purpose}, appointment ${c.window}, ${c.likelihood} likely to go ahead${getDefects(c).length ? `, ${getDefects(c).length} warnings` : ""}. Show reasons.`}
                                   className={`absolute top-1/2 -translate-y-1/2 h-11 rounded-md cursor-pointer hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all flex flex-col justify-center px-1 overflow-hidden shadow-sm ${colorClass}`}
                                   style={{ left: `${left}%`, width: `${Math.max(1.5, width)}%` }}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-semibold text-xs truncate flex items-center gap-1">
                                      {getDefects(c).some(d => d.owner === "advocate") && <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />}
                                      <FileText className="w-3 h-3 hidden sm:block shrink-0" />
                                       {c.purpose}
                                    </span>
                                  </div>
                                  {width > 7 && <span className="text-[10px] truncate leading-tight">{c.window}</span>}
                                  <LikelihoodDots level={c.likelihood} />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {Object.keys(casesByAdvocate).length === 0 && (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                          No cases scheduled for this day in the timeline.
                        </div>
                      )}
                    </div>

                    {dayInfo.overflow.length > 0 && (
                      <div className="flex min-h-[4rem] bg-muted/20 border-t border-dashed">
                        <div className="w-48 shrink-0 border-r p-3 text-sm font-medium flex items-center text-amber-600">
                          <AlertCircle className="w-4 h-4 mr-2" /> If the day runs long
                        </div>
                        <div className="flex-1 p-3 flex flex-wrap gap-2 items-center">
                          <span className="text-xs text-muted-foreground">These matters need review for the next sitting:</span>
                          {dayInfo.overflow.map(cId => (
                              <Badge key={cId} variant="outline" className="px-3 py-1.5 bg-background shadow-sm hover:shadow cursor-pointer transition-all">
                                {cId.split('-')[0]}
                              </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {dayInfo.held.length > 0 && (
                <Card className="overflow-hidden border-amber-200/70">
                  <CardHeader className="border-b bg-amber-50/60 pb-3 dark:bg-amber-950/20">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">Not immediately listed</CardTitle>
                      <Badge variant="outline" className="border-amber-200 bg-card text-amber-800">{dayInfo.held.length}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Record-based court-side defects need confirmation before listing. Capacity deferrals are shown separately; stage risks alone do not block a case.</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="divide-y divide-border">
                      {(showAllHeld ? dayInfo.held : dayInfo.held.slice(0, 4)).map(h => (
                        <li key={h.caseId} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link href={`/roster/${encodeURIComponent(h.caseId)}`} className="text-sm font-semibold text-primary hover:underline">{h.caseId}</Link>
                              <Badge variant="outline" className={h.reason.code !== "DAY_FULL" ? "border-amber-200 text-amber-800 dark:text-amber-300" : "text-muted-foreground"}>{h.reason.code === "DAY_FULL" ? "Day is full" : "Not today"}</Badge>
                            </div>
                            {getDefects(h).length > 0 && (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {(showAllHeld ? getDefects(h) : getDefects(h).slice(0, 2)).map(d => <DefectChip key={d.code} defect={d} />)}
                                {!showAllHeld && getDefects(h).length > 2 && <span className="text-xs text-muted-foreground">+{getDefects(h).length - 2} more</span>}
                              </div>
                            )}
                            <p className="mt-1 text-xs text-muted-foreground">{h.reason.code === "DAY_FULL" ? h.reason.detail : `From the record: “${h.reason.detail}”`}</p>
                          </div>
                          <span className="shrink-0 text-right text-xs text-muted-foreground">
                            {h.reason.code !== "DAY_FULL"
                              ? `Clears when: ${h.readyDate}`
                              : isValid(new Date(h.readyDate))
                                ? `Consider from ${format(new Date(`${h.readyDate}T12:00:00`), "MMM d, yyyy")}`
                                : "Consider at a later sitting"}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {dayInfo.held.length > 4 && (
                      <button type="button" aria-expanded={showAllHeld} onClick={() => setShowAllHeld(value => !value)} className="w-full border-t px-5 py-2.5 text-left text-xs font-medium text-primary hover:bg-muted/50">
                        {showAllHeld ? "Show fewer cases" : `Show all ${dayInfo.held.length} cases`}
                      </button>
                    )}
                  </CardContent>
                </Card>
              )}

            </div>
          )}
        </>
      )}

      {/* Why This Case Side Panel */}
      <Sheet open={!!selectedCase} onOpenChange={(open) => !open && setSelectedCase(null)}>
        <SheetContent className="w-full sm:max-w-md font-sans overflow-y-auto">
          {selectedCase && (
            <>
              <SheetHeader className="mb-6 border-b pb-4 mt-4">
                <SheetTitle className="text-2xl">Case {selectedCase.caseId.split('-')[0]}</SheetTitle>
                <SheetDescription className="flex items-center gap-2 text-base">
                  <Clock className="w-4 h-4" /> {selectedCase.start} – {selectedCase.end} ({selectedCase.duration} mins)
                </SheetDescription>
              </SheetHeader>
              
              <div className="space-y-6">
                {getDefects(selectedCase).length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">What could stop the next hearing</h4>
                    <div className="space-y-2">{getDefects(selectedCase).map(d => <DefectDetails key={d.code} defect={d} />)}</div>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Why was this scheduled?</h4>
                  <div className="space-y-3">
                    {selectedCase.reasons.map((r, idx) => (
                      <div key={idx} className="bg-muted/40 p-3 rounded-lg border border-border/50">
                         <div className="font-medium text-sm text-foreground mb-1">{reasonLabel(r.code)}</div>
                        <div className="text-sm text-muted-foreground leading-relaxed">{r.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border p-3 rounded-lg shadow-sm">
                    <div className="text-xs text-muted-foreground mb-1">Advocate</div>
                    <div className="font-medium truncate">{selectedCase.advocateId}</div>
                  </div>
                  <div className="bg-card border p-3 rounded-lg shadow-sm">
                    <div className="text-xs text-muted-foreground mb-1">Purpose</div>
                    <div className="font-medium truncate">{selectedCase.purpose}</div>
                  </div>
                  <div className="bg-card border p-3 rounded-lg shadow-sm">
                    <div className="text-xs text-muted-foreground mb-1">Likelihood</div>
                    <div className="font-medium flex items-center gap-2">
                      {selectedCase.likelihood} <LikelihoodDots level={selectedCase.likelihood} />
                    </div>
                  </div>
                  <div className="bg-card border p-3 rounded-lg shadow-sm">
                    <div className="text-xs text-muted-foreground mb-1">Time Block</div>
                     <div className="font-medium">{selectedCase.block}<span className="block text-xs text-muted-foreground">Window {selectedCase.window}</span></div>
                  </div>
                </div>

                <div className="pt-6 border-t mt-8">
                  <h4 className="font-semibold mb-1">Adjust Schedule</h4>
                  <p className="text-xs text-muted-foreground mb-4">Manually move this case to a different date.</p>
                  <div className="flex gap-2 mb-3">
                     <select aria-label="Move to a sitting day" value={moveDate} onChange={e => setMoveDate(e.target.value)} className="flex-1 min-w-0 rounded-md border bg-background px-3 py-2">
                       {preview?.days.map(day => <option key={day.date} value={day.date}>{format(new Date(`${day.date}T12:00:00`), "EEE, MMM d")}</option>)}
                     </select>
                    <Button onClick={() => {
                      if (!moveDate) return;
                       addMove({ caseId: selectedCase.caseId, date: moveDate, order: 0, note: moveNote.trim() || undefined });
                      toast({ title: "Case Moved", description: `Case ${selectedCase.caseId.split('-')[0]} moved to ${moveDate}` });
                      setSelectedCase(null);
                    }}>Record Move</Button>
                  </div>
                   <Input aria-label="Reason for change, optional" placeholder="Reason for change (optional)" value={moveNote} onChange={e => setMoveNote(e.target.value)} />
                  {moves.find(m => m.caseId === selectedCase.caseId) && (
                    <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => {
                      removeMove(selectedCase.caseId);
                      toast({ title: "Move Cancelled", description: "Case reverted to original schedule." });
                      setSelectedCase(null);
                    }}>
                      Cancel Override
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}