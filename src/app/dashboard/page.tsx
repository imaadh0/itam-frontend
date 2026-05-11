"use client";

import { useEffect, useState } from "react";
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
import { Monitor, CheckCircle, Clock, PenTool } from "lucide-react";

interface AssetListResponse {
  pagination: {
    total: number;
  };
}

interface RecentAssignment {
  id: string;
  assignedAt: string;
  returnedAt: string | null;
  asset: {
    tag: string;
    brand: string;
    model: string;
  };
  user: {
    name: string;
  };
}

interface AssignmentsResponse {
  assignments: RecentAssignment[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    total: 0,
    assigned: 0,
    available: 0,
    underRepair: 0,
  });
  const [recentAssignments, setRecentAssignments] = useState<RecentAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [
          totalRes,
          assignedRes,
          availableRes,
          repairRes,
          assignmentsRes,
        ] = await Promise.all([
          api.get<AssetListResponse>("/assets", { params: { limit: 1 } }),
          api.get<AssetListResponse>("/assets", { params: { limit: 1, status: "ASSIGNED" } }),
          api.get<AssetListResponse>("/assets", { params: { limit: 1, status: "AVAILABLE" } }),
          api.get<AssetListResponse>("/assets", { params: { limit: 1, status: "UNDER_REPAIR" } }),
          api.get<AssignmentsResponse>("/assignments"),
        ]);

        setStats({
          total: totalRes.data.pagination.total,
          assigned: assignedRes.data.pagination.total,
          available: availableRes.data.pagination.total,
          underRepair: repairRes.data.pagination.total,
        });

        // Backend orders by assignedAt desc, so we take the first 5
        setRecentAssignments(assignmentsRes.data.assignments.slice(0, 5));
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground">
      <div className="mx-auto max-w-6xl space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <span className="text-muted-foreground">Loading dashboard...</span>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="transition-all hover:-translate-y-1 hover:shadow-md hover:border-primary/50 group">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Total Assets</CardTitle>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Monitor className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight">{stats.total}</div>
                </CardContent>
              </Card>
              <Card className="transition-all hover:-translate-y-1 hover:shadow-md hover:border-emerald-500/50 group">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Assigned Assets</CardTitle>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight">{stats.assigned}</div>
                </CardContent>
              </Card>
              <Card className="transition-all hover:-translate-y-1 hover:shadow-md hover:border-blue-500/50 group">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Available Assets</CardTitle>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                    <Clock className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight">{stats.available}</div>
                </CardContent>
              </Card>
              <Card className="transition-all hover:-translate-y-1 hover:shadow-md hover:border-amber-500/50 group">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Under Repair</CardTitle>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                    <PenTool className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold tracking-tight">{stats.underRepair}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Tag</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentAssignments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No recent assignments
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentAssignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">{assignment.asset.tag}</TableCell>
                          <TableCell>{assignment.asset.brand} {assignment.asset.model}</TableCell>
                          <TableCell>{assignment.user.name}</TableCell>
                          <TableCell>{new Date(assignment.assignedAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {assignment.returnedAt ? (
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Returned
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                Active
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
