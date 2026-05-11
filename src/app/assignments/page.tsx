"use client";

import { useEffect, useState, FormEvent } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Undo2 } from "lucide-react";

interface Asset {
  id: string;
  tag: string;
  brand: string;
  model: string;
  status: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

interface Assignment {
  id: string;
  assignedAt: string;
  returnedAt: string | null;
  asset: {
    id: string;
    tag: string;
    brand: string;
    model: string;
    category: string;
    status: string;
  };
  user: { id: string; name: string; email: string };
  assignedBy: { id: string; name: string };
  returnedBy: { id: string; name: string } | null;
}

export default function AssignmentsPage() {
  const { user } = useAuth();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const isManager = user?.role === "IT_MANAGER" || user?.role === "IT_STAFF";

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignmentsRes, assetsRes, usersRes] = await Promise.all([
        api.get<{ assignments: Assignment[] }>("/assignments"),
        api.get<{ assets: Asset[] }>("/assets", {
          params: { status: "AVAILABLE", limit: 100 },
        }),
        api.get<{ users: User[] }>("/users"),
      ]);

      setAssignments(assignmentsRes.data.assignments);
      setAvailableAssets(assetsRes.data.assets);
      setActiveUsers(usersRes.data.users.filter((u) => u.isActive));
    } catch (error) {
      console.error("Failed to load assignments", error);
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAssign = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !selectedUserId) return;

    try {
      setIsSubmitting(true);
      await api.post("/assignments", {
        assetId: selectedAssetId,
        userId: selectedUserId,
      });
      toast.success("Asset assigned successfully");
      setIsDialogOpen(false);
      setSelectedAssetId("");
      setSelectedUserId("");
      fetchData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ?? "Failed to create assignment"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = async (assignmentId: string) => {
    if (!window.confirm("Mark this asset as returned?")) return;
    try {
      await api.patch(`/assignments/${assignmentId}/return`);
      toast.success("Asset returned successfully");
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Failed to return asset");
    }
  };

  const activeAssignments = assignments.filter((a) => !a.returnedAt);
  const returnedAssignments = assignments.filter((a) => a.returnedAt);

  return (
    <main className="min-h-screen bg-background px-4 sm:px-6 py-6 sm:py-8 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
          {isManager && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Assign Asset
            </Button>
          )}
        </div>

        {/* Assign Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Assign Asset</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAssign} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Asset (Available only)</Label>
                <Select
                  value={selectedAssetId}
                  onValueChange={(v) => setSelectedAssetId(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an asset...">
                      {selectedAssetId
                        ? (() => {
                            const a = availableAssets.find((x) => x.id === selectedAssetId);
                            return a ? `${a.tag} — ${a.brand} ${a.model}` : "Select an asset...";
                          })()
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableAssets.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No available assets
                      </SelectItem>
                    ) : (
                      availableAssets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.tag} — {a.brand} {a.model}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select
                  value={selectedUserId}
                  onValueChange={(v) => setSelectedUserId(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user...">
                      {selectedUserId
                        ? (() => {
                            const u = activeUsers.find((x) => x.id === selectedUserId);
                            return u ? `${u.name} (${u.email})` : "Select a user...";
                          })()
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {activeUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !selectedAssetId || !selectedUserId}
              >
                {isSubmitting ? "Assigning..." : "Confirm Assignment"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Active Assignments */}
        <Card>
          <CardHeader className="pb-3">
            <h2 className="text-lg font-semibold">
              Active Assignments{" "}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ({activeAssignments.length})
              </span>
            </h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                Loading...
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Assigned By</TableHead>
                      <TableHead>Date</TableHead>
                      {isManager && (
                        <TableHead className="text-right">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeAssignments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={isManager ? 5 : 4}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No active assignments.
                        </TableCell>
                      </TableRow>
                    ) : (
                      activeAssignments.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <div className="font-medium">{a.asset.tag}</div>
                            <div className="text-xs text-muted-foreground">
                              {a.asset.brand} {a.asset.model}
                            </div>
                          </TableCell>
                          <TableCell>{a.user.name}</TableCell>
                          <TableCell>{a.assignedBy.name}</TableCell>
                          <TableCell>
                            {new Date(a.assignedAt).toLocaleDateString()}
                          </TableCell>
                          {isManager && (
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReturn(a.id)}
                                className="gap-1"
                              >
                                <Undo2 className="h-4 w-4" />
                                Return
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader className="pb-3">
            <h2 className="text-lg font-semibold">
              Assignment History{" "}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                ({returnedAssignments.length})
              </span>
            </h2>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Returned</TableHead>
                    <TableHead>Returned By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnedAssignments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No assignment history yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    returnedAssignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="font-medium">{a.asset.tag}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.asset.brand} {a.asset.model}
                          </div>
                        </TableCell>
                        <TableCell>{a.user.name}</TableCell>
                        <TableCell>
                          {new Date(a.assignedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {a.returnedAt
                            ? new Date(a.returnedAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {a.returnedBy?.name ?? "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
