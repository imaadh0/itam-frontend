"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { ArrowLeft, ClipboardCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth, type UserRole } from "@/lib/AuthContext";
import api, { getApiErrorMessage } from "@/lib/api";

type AssetStatus = "AVAILABLE" | "ASSIGNED" | "UNDER_REPAIR" | "RETIRED";

interface AssetUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
}

interface AssetAssignment {
  id: string;
  assetId: string;
  userId: string;
  assignedAt: string;
  returnedAt: string | null;
  returnedById: string | null;
  user: AssetUser;
  assignedBy: AssetUser;
  returnedBy: AssetUser | null;
}

interface AssetDetail {
  id: string;
  tag: string;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseCost: string;
  category: string;
  status: AssetStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  assignments: AssetAssignment[];
}

interface AssetDetailResponse {
  asset: AssetDetail;
}

interface UsersResponse {
  users: AssetUser[];
}

const statusTone: Record<AssetStatus, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  ASSIGNED: "bg-sky-100 text-sky-800",
  UNDER_REPAIR: "bg-amber-100 text-amber-800",
  RETIRED: "bg-slate-200 text-slate-700",
};

function formatCurrency(value: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRole(role: UserRole) {
  return role.replace("_", " ");
}

export default function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();

  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [employees, setEmployees] = useState<AssetUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAssign = user?.role === "IT_MANAGER" || user?.role === "IT_STAFF";
  const activeAssignment =
    asset?.assignments.find((assignment) => assignment.returnedAt === null) ?? null;
  const activeEmployees = employees
    .filter((employee) => employee.isActive !== false)
    .sort((left, right) => left.name.localeCompare(right.name));

  async function loadAsset() {
    const assetResponse = await api.get<AssetDetailResponse>(`/assets/${id}`);
    setAsset(assetResponse.data.asset);
  }

  useEffect(() => {
    let isActive = true;

    async function loadPage() {
      try {
        setIsLoading(true);
        setError(null);
        const assetRequest = api.get<AssetDetailResponse>(`/assets/${id}`);
        const usersRequest = canAssign
          ? api.get<UsersResponse>("/users")
          : Promise.resolve(null);
        const [assetResponse, usersResponse] = await Promise.all([
          assetRequest,
          usersRequest,
        ]);

        if (!isActive) {
          return;
        }

        setAsset(assetResponse.data.asset);

        setEmployees(usersResponse?.data.users ?? []);
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setError(
          loadError instanceof AxiosError &&
            typeof loadError.response?.data?.message === "string"
            ? loadError.response.data.message
            : "Failed to load asset details",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      isActive = false;
    };
  }, [canAssign, id]);

  async function handleAssignDevice() {
    if (!selectedUserId) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await api.post("/assignments", {
        assetId: id,
        userId: selectedUserId,
      });

      setIsAssignDialogOpen(false);
      setSelectedUserId(null);
      await loadAsset();
      toast.success("Device assigned");
    } catch (submitError) {
      const message = getApiErrorMessage(submitError, "Failed to assign device");
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReturnDevice() {
    if (!activeAssignment) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await api.patch(`/assignments/${activeAssignment.id}/return`);
      await loadAsset();
      toast.success("Device marked as returned");
    } catch (submitError) {
      const message = getApiErrorMessage(submitError, "Failed to mark device as returned");
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 text-foreground">
        <div className="mx-auto max-w-6xl">
          <Card>
            <CardContent className="py-10 text-sm text-muted-foreground">
              Loading asset details...
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!asset) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 text-foreground">
        <div className="mx-auto max-w-6xl space-y-4">
          <Link
            href="/assets"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Assets
          </Link>
          <Card>
            <CardContent className="py-10 text-sm text-destructive">
              {error ?? "Asset not found"}
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Link
              href="/assets"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to Assets
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight">{asset.tag}</h1>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[asset.status]}`}
                >
                  {asset.status.replace("_", " ")}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {asset.brand} {asset.model}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {asset.status === "AVAILABLE" && canAssign ? (
              <Button onClick={() => setIsAssignDialogOpen(true)}>
                <ClipboardCheck className="mr-2 size-4" />
                Assign Device
              </Button>
            ) : null}
            {asset.status === "ASSIGNED" && canAssign && activeAssignment ? (
              <Button onClick={() => void handleReturnDevice()} disabled={isSubmitting}>
                <RotateCcw className="mr-2 size-4" />
                {isSubmitting ? "Updating..." : "Mark as Returned"}
              </Button>
            ) : null}
          </div>
        </div>

        {error ? (
          <Card>
            <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Asset Details</CardTitle>
            <CardDescription>Current inventory record and lifecycle metadata.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Category</p>
                <p className="mt-2 text-sm font-medium">{asset.category}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Serial Number</p>
                <p className="mt-2 text-sm font-medium">{asset.serialNumber}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Purchase Cost</p>
                <p className="mt-2 text-sm font-medium">{formatCurrency(asset.purchaseCost)}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Updated</p>
                <p className="mt-2 text-sm font-medium">{formatDateTime(asset.updatedAt)}</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="mt-2 text-sm text-foreground">
                {asset.notes?.trim() ? asset.notes : "No notes on this asset."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment History</CardTitle>
            <CardDescription>Complete assignment and return timeline for this asset.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Assigned By</TableHead>
                  <TableHead>Assigned At</TableHead>
                  <TableHead>Returned At</TableHead>
                  <TableHead>Returned By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asset.assignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No assignment history recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  asset.assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div className="font-medium">{assignment.user.name}</div>
                        <div className="text-xs text-muted-foreground">{assignment.user.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{assignment.assignedBy.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatRole(assignment.assignedBy.role)}
                        </div>
                      </TableCell>
                      <TableCell>{formatDateTime(assignment.assignedAt)}</TableCell>
                      <TableCell>{formatDateTime(assignment.returnedAt)}</TableCell>
                      <TableCell>
                        {assignment.returnedBy ? (
                          <>
                            <div className="font-medium">{assignment.returnedBy.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatRole(assignment.returnedBy.role)}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Device</DialogTitle>
              <DialogDescription>
                Select an employee to assign {asset.tag} to.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="assignee">Employee</Label>
              <Select value={selectedUserId} onValueChange={(value) => setSelectedUserId(value)}>
                <SelectTrigger id="assignee" className="w-full">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.length > 0 ? (
                    activeEmployees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name} ({formatRole(employee.role)})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no-employees__" disabled>
                      No active employees available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                onClick={() => void handleAssignDevice()}
                disabled={!selectedUserId || isSubmitting}
              >
                {isSubmitting ? "Assigning..." : "Assign Device"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
