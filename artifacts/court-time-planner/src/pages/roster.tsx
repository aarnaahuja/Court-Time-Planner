import { useState, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetCases, useGetRosterSummary, useUploadRoster, getGetCasesQueryKey, getGetRosterSummaryQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Upload, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function RosterPage() {
  const { data: summary, isLoading: sumLoading } = useGetRosterSummary();
  const { data: cases, isLoading: casesLoading } = useGetCases();
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  const [advocateFilter, setAdvocateFilter] = useState("");
  const [flagFilter, setFlagFilter] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const picker = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const uploadRoster = useUploadRoster();

  const filteredCases = useMemo(() => {
    if (!cases) return [];
    const lower = searchTerm.toLowerCase();
    return cases.filter(c => (
      c.filingNumber.toLowerCase().includes(lower) || 
      c.id.toLowerCase().includes(lower) ||
      c.advocateId.toLowerCase().includes(lower) ||
      c.stage.toLowerCase().includes(lower) ||
      c.partyId.toLowerCase().includes(lower)
    ) && (!stageFilter || c.stage === stageFilter)
      && (!advocateFilter || c.advocateId.toLowerCase().includes(advocateFilter.toLowerCase()))
      && (!ageFilter || (ageFilter === "old" ? c.ageYears >= 4 : ageFilter === "new" ? c.ageYears < 1 : c.ageYears >= 1 && c.ageYears < 4))
      && (!flagFilter || c.flags.length > 0));
  }, [cases, searchTerm, stageFilter, ageFilter, advocateFilter, flagFilter]);

  const handleUpload = async (file?: File) => {
    if (!file) return;
    setUploadError("");
    if (!file.name.toLowerCase().endsWith(".csv") || file.size > 4_000_000) {
      setUploadError("Choose a CSV file smaller than 4 MB.");
      return;
    }
    uploadRoster.mutate({ data: { csv: await file.text() } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCasesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRosterSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      },
      onError: (error) => setUploadError((error as {data?: {error?: string}}).data?.error || "This roster could not be read. Check the column names and values."),
    });
  };

  if (sumLoading || casesLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-[400px] w-full" /></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">Case Roster</h1>
          <p className="text-muted-foreground mt-1">Manage and search the complete pool of cases</p>
        </div>
        <div className="flex items-center gap-2">
          <input className="sr-only" ref={picker} type="file" accept=".csv,text/csv" aria-label="Select roster CSV" onChange={e => { void handleUpload(e.target.files?.[0]); e.target.value = ""; }} />
          <Button onClick={() => picker.current?.click()} className="gap-2" disabled={uploadRoster.isPending}>
            <Upload className="w-4 h-4" /> {uploadRoster.isPending ? "Uploading..." : "Upload Roster"}
          </Button>
        </div>
      </div>
      {uploadError && <p role="alert" className="text-sm text-destructive border border-destructive/30 rounded-md p-3">{uploadError}</p>}
      <p className="text-sm text-muted-foreground">Sample roster: 100 anonymised cases. Readiness is inferred from latest-hearing summaries and must be confirmed.</p>

      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-serif">{summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
               <CardTitle className="text-sm text-muted-foreground">No process warning found</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-serif text-primary">{summary.ready}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Process to Confirm</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-serif text-muted-foreground">{summary.waiting}</div>
            </CardContent>
          </Card>
        </div>
      )}
      {summary && <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5"><h2 className="font-semibold mb-3">Cases by stage</h2>{summary.stages.map(s => <div key={s.label} className="mb-2 text-sm"><div className="flex justify-between"><span>{s.label}</span><span>{s.count}</span></div><div className="h-2 bg-muted rounded-full"><div className="h-full bg-primary rounded-full" style={{width:`${s.count / summary.total * 100}%`}} /></div></div>)}</Card>
        <Card className="p-5"><h2 className="font-semibold mb-3">Cases by age</h2>{summary.ages.map(s => <div key={s.label} className="mb-2 text-sm"><div className="flex justify-between"><span>{s.label}</span><span>{s.count}</span></div><div className="h-2 bg-muted rounded-full"><div className="h-full bg-primary rounded-full" style={{width:`${s.count / summary.total * 100}%`}} /></div></div>)}</Card>
      </div>}

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by filing number, party, or stage..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select aria-label="Filter by stage" className="border rounded-md p-2 bg-background" value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
              <option value="">All stages</option>{[...new Set(cases?.map(c => c.stage) || [])].sort().map(s => <option key={s}>{s}</option>)}
            </select>
            <select aria-label="Filter by age" className="border rounded-md p-2 bg-background" value={ageFilter} onChange={e => setAgeFilter(e.target.value)}>
              <option value="">All ages</option><option value="new">Under 1 year</option><option value="mid">1–4 years</option><option value="old">4+ years</option>
            </select>
            <Input aria-label="Filter by advocate" placeholder="Advocate ID" className="max-w-32" value={advocateFilter} onChange={e => setAdvocateFilter(e.target.value)} />
            <label className="flex items-center gap-2 text-sm whitespace-nowrap"><input type="checkbox" checked={flagFilter} onChange={e => setFlagFilter(e.target.checked)} /> Flagged only</label>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filing No.</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Age (Years)</TableHead>
                <TableHead>Advocate</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link href={`/roster/${c.id}`} className="hover:underline flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      {c.filingNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{c.stage}</TableCell>
                  <TableCell>
                    <span className={c.ageYears > 5 ? "text-destructive font-semibold" : ""}>
                      {c.ageYears}
                    </span>
                  </TableCell>
                  <TableCell>{c.advocateId}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {c.flags.map(f => (
                        <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/roster/${c.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No cases found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}