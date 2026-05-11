"use client";

import { FormEvent, useEffect, useState } from "react";
import { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { Edit, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth, type UserRole } from "@/lib/AuthContext";
import api, { getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UsersResponse {
  users: UserRecord[];
}

type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: "true" | "false";
};

const INITIAL_FORM_STATE: UserFormState = {
  name: "",
  email: "",
  password: "",
  role: "IT_STAFF",
  isActive: "true",
};

const roleOptions: UserRole[] = ["ADMIN", "IT_MANAGER", "IT_STAFF"];

function formatRole(role: UserRole) {
  return role.replace("_", " ");
}

export default function UsersPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formState, setFormState] = useState<UserFormState>(INITIAL_FORM_STATE);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [isAuthLoading, router, user]);

  async function fetchUsers() {
    try {
      setIsPageLoading(true);
      setError(null);

      const response = await api.get<UsersResponse>("/users");
      setUsers(response.data.users);
    } catch (fetchError) {
      setError(
        fetchError instanceof AxiosError &&
          typeof fetchError.response?.data?.message === "string"
          ? fetchError.response.data.message
          : "Failed to load users",
      );
    } finally {
      setIsPageLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === "ADMIN") {
      window.queueMicrotask(() => {
        void fetchUsers();
      });
    }
  }, [user]);

  function openAddDialog() {
    setEditingUserId(null);
    setFormState(INITIAL_FORM_STATE);
    setError(null);
    setIsDialogOpen(true);
  }

  function openEditDialog(targetUser: UserRecord) {
    setEditingUserId(targetUser.id);
    setFormState({
      name: targetUser.name,
      email: targetUser.email,
      password: "",
      role: targetUser.role,
      isActive: String(targetUser.isActive) as "true" | "false",
    });
    setError(null);
    setIsDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);

      if (editingUserId) {
        await api.patch(`/users/${editingUserId}`, {
          name: formState.name,
          email: formState.email,
          role: formState.role,
          isActive: formState.isActive === "true",
        });
        toast.success("User updated");
      } else {
        await api.post("/users", {
          name: formState.name,
          email: formState.email,
          password: formState.password,
          role: formState.role,
        });
        toast.success("User created");
      }

      setIsDialogOpen(false);
      setEditingUserId(null);
      setFormState(INITIAL_FORM_STATE);
      await fetchUsers();
    } catch (submitError) {
      const message = getApiErrorMessage(
        submitError,
        editingUserId ? "Failed to update user" : "Failed to create user",
      );
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthLoading || (user && user.role !== "ADMIN")) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 text-foreground">
        <div className="mx-auto max-w-6xl">
          <Card>
            <CardContent className="py-10 text-sm text-muted-foreground">
              Loading users...
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage user accounts and role access.
            </p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        {error && !isDialogOpen ? (
          <Card>
            <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>User Directory</CardTitle>
          </CardHeader>
          <CardContent>
            {isPageLoading ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Loading users...
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No users found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.name}</TableCell>
                          <TableCell>{record.email}</TableCell>
                          <TableCell>{formatRole(record.role)}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                record.isActive
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              {record.isActive ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(record)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle>{editingUserId ? "Edit User" : "Add User"}</DialogTitle>
              <DialogDescription>
                {editingUserId
                  ? "Update role, contact details, or deactivate the account."
                  : "Create a new user account."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState({ ...formState, name: event.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formState.email}
                  onChange={(event) =>
                    setFormState({ ...formState, email: event.target.value })
                  }
                  required
                />
              </div>

              {!editingUserId ? (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formState.password}
                    onChange={(event) =>
                      setFormState({ ...formState, password: event.target.value })
                    }
                    required
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formState.role}
                  onValueChange={(value) =>
                    setFormState({
                      ...formState,
                      role: (value ?? "IT_STAFF") as UserRole,
                    })
                  }
                >
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue placeholder="Select role">
                      {formState.role ? formatRole(formState.role) : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {formatRole(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editingUserId ? (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formState.isActive}
                    onValueChange={(value) =>
                      setFormState({
                        ...formState,
                        isActive: (value ?? "true") as "true" | "false",
                      })
                    }
                  >
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue placeholder="Select status">
                        {formState.isActive === "true" ? "Active" : "Inactive"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting
                  ? editingUserId
                    ? "Saving..."
                    : "Creating..."
                  : editingUserId
                    ? "Save Changes"
                    : "Create User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
