"use client";

import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useAuth, type UserRole } from "@/lib/AuthContext";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AuditActor {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuditLogRecord {
  id: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  diff: Record<string, unknown> | null;
  createdAt: string;
  actor: AuditActor;
}

interface AuditResponse {
  auditLogs: AuditLogRecord[];
}

/** Pull the most useful identifier out of an object snapshot (asset tag, user email, etc.) */
function summariseRecord(obj: unknown): string {
  if (!obj || typeof obj !== "object") return "-";
  const r = obj as Record<string, unknown>;
  
  // Try common identifying fields in priority order
  const label =
    (typeof r.tag === "string" && r.tag) ||
    (typeof r.email === "string" && r.email) ||
    (typeof r.name === "string" && r.name) ||
    (r.asset && typeof r.asset === "object" && typeof (r.asset as Record<string, unknown>).tag === "string" ? `Asset ${(r.asset as Record<string, unknown>).tag}` : null) ||
    null;
    
  const secondary =
    (typeof r.brand === "string" && typeof r.model === "string"
      ? `${r.brand} ${r.model}`
      : null) ||
    (typeof r.role === "string" ? r.role : null) ||
    (r.user && typeof r.user === "object" && typeof (r.user as Record<string, unknown>).name === "string" ? `assigned to ${(r.user as Record<string, unknown>).name}` : null) ||
    null;
    
  return [label, secondary].filter(Boolean).join(" — ") || "(record)";
}

function formatRole(role: UserRole) {
  return role.replace("_", " ");
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value);
}

function hasBeforeAfterShape(v: unknown): v is { before: unknown; after: unknown } {
  return typeof v === "object" && v !== null && "before" in v && "after" in v;
}

type DiffEntry = { field: string; before: string; after: string };

function getDiffEntries(
  action: string,
  diff: Record<string, unknown> | null
): DiffEntry[] | "create" | "delete" | "return" | "read" {
  if (!diff) return [];

  // READ actions — caller will handle
  if (action === "READ") return "read";

  // CREATE: { before: null, after: fullObject }
  if (action === "CREATE" && "after" in diff) return "create";

  // DELETE: { before: fullObject, after: null }
  if (action === "DELETE" && "before" in diff) return "delete";

  // RETURN: { before: oldAssignment, after: newAssignment }
  if (action === "RETURN" && "before" in diff && "after" in diff) return "return";

  // UPDATE: { fieldName: { before, after }, ... }
  return Object.entries(diff)
    .filter(([, value]) => hasBeforeAfterShape(value))
    .map(([field, value]) => {
      const v = value as { before: unknown; after: unknown };
      return {
        field,
        before: renderValue(v.before),
        after: renderValue(v.after),
      };
    });
}

function ChangesCell({
  action,
  diff,
}: {
  action: string;
  diff: Record<string, unknown> | null;
}) {
  const result = getDiffEntries(action, diff);

  // READ noise — show a subtle label, no blob
  if (result === "read") {
    const count =
      diff && typeof diff.count === "number" ? ` (${diff.count} records)` : "";
    return (
      <span className="text-xs text-muted-foreground italic">
        Viewed list{count}
      </span>
    );
  }

  // CREATE — show what was created
  if (result === "create") {
    const after = diff?.after;
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
          Created
        </span>
        <p className="text-xs text-muted-foreground">{summariseRecord(after)}</p>
      </div>
    );
  }

  // DELETE — show what was deleted
  if (result === "delete") {
    const before = diff?.before;
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
          Deleted
        </span>
        <p className="text-xs text-muted-foreground">{summariseRecord(before)}</p>
      </div>
    );
  }

  // RETURN — show asset and returned-to info
  if (result === "return") {
    const after = diff?.after as Record<string, unknown> | undefined;
    const returnedAt =
      typeof after?.returnedAt === "string"
        ? new Date(after.returnedAt).toLocaleDateString()
        : "-";
    const assetTag =
      after && typeof after.asset === "object" && after.asset !== null
        ? (after.asset as Record<string, unknown>).tag
        : "-";
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
          Returned
        </span>
        <p className="text-xs text-muted-foreground">
          Asset {String(assetTag)} · {returnedAt}
        </p>
      </div>
    );
  }

  // UPDATE — field-by-field diff
  const entries = result as DiffEntry[];
  if (entries.length === 0) {
    return <span className="text-muted-foreground text-xs">No field changes</span>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.field} className="rounded-md border bg-muted/30 p-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {entry.field}
          </p>
          <div className="mt-1 grid gap-1 text-xs sm:grid-cols-2">
            <div>
              <span className="font-medium text-muted-foreground">Old: </span>
              <span className="break-words">{entry.before}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">New: </span>
              <span className="break-words">{entry.after}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


export default function AuditPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "IT_MANAGER") {
      router.replace("/dashboard");
    }
  }, [isAuthLoading, router, user]);

  async function fetchAuditLogs() {
    try {
      setIsPageLoading(true);
      setError(null);

      const response = await api.get<AuditResponse>("/audit");
      setAuditLogs(response.data.auditLogs);
    } catch (fetchError) {
      setError(
        fetchError instanceof AxiosError &&
          typeof fetchError.response?.data?.message === "string"
          ? fetchError.response.data.message
          : "Failed to load audit log",
      );
    } finally {
      setIsPageLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === "IT_MANAGER") {
      window.queueMicrotask(() => {
        void fetchAuditLogs();
      });
    }
  }, [user]);

  if (isAuthLoading || (user && user.role !== "IT_MANAGER")) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 text-foreground">
        <div className="mx-auto max-w-6xl">
          <Card>
            <CardContent className="py-10 text-sm text-muted-foreground">
              Loading audit log...
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review system changes and operational history.
          </p>
        </div>

        {error ? (
          <Card>
            <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isPageLoading ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Loading audit log...
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>Changes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No audit entries found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditLogs.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{formatTimestamp(entry.createdAt)}</TableCell>
                          <TableCell>
                            <div className="font-medium">{entry.actor.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatRole(entry.actor.role)}
                            </div>
                          </TableCell>
                          <TableCell>{entry.action}</TableCell>
                          <TableCell>{entry.entity}</TableCell>
                          <TableCell className="font-mono text-xs">{entry.entityId}</TableCell>
                          <TableCell className="min-w-[280px] whitespace-normal">
                            <ChangesCell action={entry.action} diff={entry.diff} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
