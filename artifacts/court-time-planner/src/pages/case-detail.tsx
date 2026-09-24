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

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: caseInfo, isLoading, isError } = useGetCase(id || "");
  const { startDate, period } = useScheduleContext();
  const { data: rules } = useGetRules();
  const preview = usePreviewSchedule();
  useEffect(() => {
    if (rules) preview.mutate({ data: { period, start_date: startDate, rules } });
  }, [rules, period, startDate]);

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  if (isError || !caseInfo) {
    return <div className="p-8 text-center text-destructive">Failed to load case {id}</div>;
  }
  const suggested = preview.data?.days.flatMap(d => d.cases).find(c => c.caseId === caseInfo.id);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/roster"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold flex items-center gap-3">
            {caseInfo.filingNumber}
            {caseInfo.flags.map(f => <Badge key={f} variant="secondary">{f}</Badge>)}
          </h1>
          <p className="text-muted-foreground mt-1">Filed on {new Date(caseInfo.filingDate).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Next recommended listing</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {suggested ? <><div className="font-semibold text-base">{suggested.date} · {suggested.window} ({suggested.block})</div><p className="text-muted-foreground mt-2">{suggested.reasons.map(r => r.detail).join(" · ")}</p></> : <p className="text-muted-foreground">{preview.isPending ? "Checking the selected schedule…" : caseInfo.waitingOn ? `${caseInfo.waitingOn}. Confirm with the registry before listing.` : `Not listed in the selected ${period} beginning ${startDate}. Review the cause list for later dates.`}</p>}
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

          <Card>
            <CardHeader>
           <CardTitle>Available hearing note</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {caseInfo.history.map((event, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="mt-1 flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      {idx !== caseInfo.history.length - 1 && <div className="w-px h-full bg-border my-1" />}
                    </div>
                    <div className="pb-4 text-sm">{event}</div>
                  </div>
                ))}
                 <p className="text-xs text-muted-foreground">The sample roster contains one latest-hearing summary, not a dated history of every hearing.</p>
                 {caseInfo.history.length === 0 && <div className="text-muted-foreground text-sm">No hearing note available.</div>}
              </div>
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
                <div className="text-2xl font-bold font-serif">{caseInfo.ageYears} Years</div>
              </div>
              <Separator />
              <div>
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4" /> Total Hearings
                </div>
                <div className="text-2xl font-bold font-serif">{caseInfo.totalHearings}</div>
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