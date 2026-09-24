import { useGetDashboard, type Case } from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data: dashboard, isLoading, isError } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className="p-8 text-center bg-destructive/10 text-destructive rounded-xl border border-destructive/20">
        <AlertTriangle className="w-8 h-8 mx-auto mb-4" />
        <h2 className="text-lg font-semibold">Failed to load dashboard</h2>
        <p>There was a problem retrieving the latest data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">
             Good morning, Justice Sehgal
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview for the next sitting date:{" "}
            <span className="font-semibold text-foreground">
              {new Date(dashboard.nextDate).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
              })}
            </span>
          </p>
        </div>
        <Button asChild className="gap-2 shrink-0">
          <Link href="/cause-list">
             Prepare tomorrow's cause list <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recommended Cases
            </CardTitle>
            <CheckCircle className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.recommendedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {dashboard.sittingHours} sitting hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
               Cases that may move forward if listed
            </CardTitle>
            <ArrowRight className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.movedForward}</div>
            <p className="text-xs text-muted-foreground mt-1">
               Estimate, not recorded outcomes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
               Cases older than 4 years
            </CardTitle>
            <Clock className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.oldCases}</div>
            <p className="text-xs text-muted-foreground mt-1">
               Trend unavailable without earlier rosters
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
               Hearings that may not go ahead
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.sentHome}</div>
            <p className="text-xs text-muted-foreground mt-1">
               Estimate, not people actually sent home
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
         <h2 className="text-xl font-serif font-semibold">Needs your attention</h2>
         <p className="text-sm text-muted-foreground">This sample does not include past adjournment streaks, verified service records, or weekly outcomes. Flags based on the supplied latest-hearing note need confirmation.</p>
        {dashboard.attention.length === 0 ? (
          <div className="p-8 text-center border rounded-xl bg-card">
            <CheckCircle className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-medium">All caught up</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No cases require manual intervention at this time.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {dashboard.attention.map((item: Case) => (
              <Card key={item.id} className="hover-elevate transition-all">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0 flex items-center gap-4">
                    <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-lg flex items-center justify-center font-bold shrink-0">
                      {item.ageYears}y
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{item.filingNumber}</span>
                        {item.flags.map((flag) => (
                           <Badge key={flag} variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">{flag === "OLD_CASE" ? "4+ years old" : flag === "WAITING_WARRANT" ? "Process needs checking" : flag}</Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                         {item.stage} {item.waitingOn ? `• ${item.waitingOn}` : "• Older case needs review"}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild className="shrink-0">
                    <Link href={`/roster/${item.id}`}>Review</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}