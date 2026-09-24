import { useEffect } from "react";
import { useGetCase, useGetRules, usePreviewSchedule } from "@workspace/api-client-react";
import { useScheduleContext } from "@/store/schedule-context";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, FileText, AlertTriangle, User, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

const displayDate = (date: string) => format(new Date(`${date}T12:00:00`), "d MMM yyyy");

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: caseInfo, isLoading, isError } = useGetCase(id || "");
  const { startDate, period, moves } = useScheduleContext();
  const { data: rules } = useGetRules();
  const preview = usePreviewSchedule();
  useEffect(() => {
    if (rules) preview.mutate({ data: { period, start_date: startDate, rules, moves } });
  }, [rules, period, startDate, moves]);

  if (isLoading) {
    return <div className="workspace-page space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  if (isError || !caseInfo) {
    return <div className="workspace-page p-8 text-center text-destructive">Failed to load case {id}</div>;
  }
  const suggested = !preview.isPending && !preview.isError
    ? preview.data?.days.flatMap(d => d.cases).find(c => c.caseId === caseInfo.id)
    : undefined;

  return (
    <div className="workspace-page space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="workspace-header flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/roster"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div>
          <div className="workspace-breadcrumb">Roster / Case detail</div>
          <h1 className="workspace-title text-3xl font-bold flex items-center gap-3">
            {caseInfo.filingNumber}
            {caseInfo.flags.map(f => <Badge key={f} variant="secondary">{f === "WAITING_WARRANT" ? "Process to confirm" : f === "OLD_CASE" ? "4+ years old" : f.replaceAll("_", " ").toLowerCase()}</Badge>)}
          </h1>
          <p className="workspace-subtitle text-muted-foreground mt-1">Filed on {displayDate(caseInfo.filingDate)}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Case timeline</CardTitle>
              <p className="text-xs text-muted-foreground">Only recorded dates and the selected preview date are shown. Earlier hearing dates were not supplied.</p>
            </CardHeader>
            <CardContent>
              <ol className="text-sm">
                <li className="flex gap-4">
                  <div className="flex flex-col items-center" aria-hidden="true"><span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-primary" /><span className="my-1 w-px flex-1 bg-border" /></div>
                  <div className="pb-6"><time dateTime={caseInfo.filingDate} className="text-xs font-medium text-primary">{displayDate(caseInfo.filingDate)}</time><p className="font-semibold">Case filed</p></div>
                </li>
                {caseInfo.history.map((event, index) => (
                  <li key={index} className="flex gap-4">
                    <div className="flex flex-col items-center" aria-hidden="true"><span className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-card" /><span className="my-1 w-px flex-1 bg-border" /></div>
                    <div className="min-w-0 pb-6"><p className="text-xs font-medium text-muted-foreground">Date not supplied</p><p className="font-semibold">Latest hearing note</p><p className="mt-1 text-muted-foreground">{event}</p></div>
                  </li>
                ))}
                <li className="flex gap-4">
                  <div aria-hidden="true"><span className={`mt-1 block h-3 w-3 shrink-0 rounded-full ${caseInfo.waitingOn ? "bg-amber-500" : "bg-primary"}`} /></div>
                  <div className="min-w-0">
                    {preview.isPending || !rules ? (
                      <p className="text-muted-foreground">Checking the selected schedule…</p>
                    ) : preview.isError ? (
                      <p className="text-destructive">The selected schedule could not be loaded. Try again from the cause list.</p>
                    ) : caseInfo.waitingOn ? (
                      <><p className="text-xs font-medium text-amber-700">No listing date yet</p><p className="font-semibold">Process confirmation needed</p><p className="mt-1 text-muted-foreground">{caseInfo.waitingOn}. This warning is inferred from the hearing note; confirm with the registry before listing.</p></>
                    ) : suggested ? (
                      <><time dateTime={suggested.date} className="text-xs font-medium text-primary">{displayDate(suggested.date)}</time><p className="font-semibold">Proposed listing · {suggested.window} ({suggested.block})</p><p className="mt-1 text-muted-foreground">{suggested.reasons.map(r => r.detail).join(" · ")}</p></>
                    ) : (
                      <><p className="text-xs font-medium text-muted-foreground">No listing date in this preview</p><p className="font-semibold">Not listed in the selected {period}</p><p className="mt-1 text-muted-foreground">Preview begins {displayDate(startDate)}. Review the cause list for a later sitting.</p></>
                    )}
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Case Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                    <User className="w-4 h-4" /> Party ID
                  </div>
                  <div>{caseInfo.partyId}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                    <User className="w-4 h-4" /> Advocate ID
                  </div>
                  <div>{caseInfo.advocateId}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4" /> Stage
                  </div>
                  <div className="font-semibold">{caseInfo.stage}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4" /> Purpose
                  </div>
                  <div>{caseInfo.purpose}</div>
                </div>
              </div>

              {caseInfo.waitingOn && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <AlertTriangle className="w-4 h-4" /> Waiting On
                  </div>
                  <div className="text-sm">{caseInfo.waitingOn}</div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4" /> Age
                </div>
                <div className="text-2xl font-bold">{caseInfo.ageYears} Years</div>
              </div>
              <Separator />
              <div>
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4" /> Total Hearings
                </div>
                <div className="text-2xl font-bold">{caseInfo.totalHearings}</div>
              </div>
              <Separator />
              <div>
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4" /> Last Hearing
                </div>
                <div className="font-medium">
                   {caseInfo.lastHearing ? "Summary available (date not supplied)" : "Not supplied"}
                </div>
              </div>
            </CardContent>
          </Card>

          {caseInfo.reasons && caseInfo.reasons.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Scheduling Reasons</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {caseInfo.reasons.map((r, i) => (
                  <div key={i} className="text-sm">
                     <span className="font-semibold">{r.code === "OLD_CASE" ? "Older case" : r.code === "NEAR_DISPOSAL" ? "Near disposal" : r.code === "WAITING_WARRANT" ? "Process needs checking" : "Reason"}:</span> {r.detail}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}