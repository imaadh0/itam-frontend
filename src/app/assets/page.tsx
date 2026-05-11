"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import api, { getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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
import { Search, Plus, Edit, Trash2 } from "lucide-react";

// Types
interface Asset {
  id: string;
  tag: string;
  brand: string;
  model: string;
  serialNumber: string;
  category: string;
  status: string;
  purchaseCost: string | number;
  notes: string | null;
}

interface Assignment {
  id: string;
  assetId: string;
  returnedAt: string | null;
  user: {
    name: string;
  };
}

interface AssetsResponse {
  assets: Asset[];
}

interface AssignmentsResponse {
  assignments: Assignment[];
}

const CATEGORIES = [
  "LAPTOP",
  "DESKTOP",
  "MONITOR",
  "PHONE",
  "TABLET",
  "PERIPHERAL",
  "OTHER",
];

const STATUSES = ["AVAILABLE", "ASSIGNED", "UNDER_REPAIR", "RETIRED"];

const INITIAL_FORM_DATA = {
  tag: "",
  brand: "",
  model: "",
  serialNumber: "",
  purchaseCost: "",
  category: "LAPTOP",
  status: "AVAILABLE",
  notes: "",
};

export default function AssetsPage() {
  const { user } = useAuth();
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [category, setCategory] = useState<string>("ALL");
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      
      const params: Record<string, string | number> = { limit: 100 };
      if (search) params.search = search;
      if (status !== "ALL") params.status = status;
      if (category !== "ALL") params.category = category;

      const [assetsRes, assignmentsRes] = await Promise.all([
        api.get<AssetsResponse>("/assets", { params }),
        api.get<AssignmentsResponse>("/assignments")
      ]);

      setAssets(assetsRes.data.assets);

      // Create a map of active assignments: assetId -> userName
      const assignmentsMap: Record<string, string> = {};
      assignmentsRes.data.assignments.forEach((assignment: Assignment) => {
        if (!assignment.returnedAt) {
          assignmentsMap[assignment.assetId] = assignment.user.name;
        }
      });
      setActiveAssignments(assignmentsMap);
    } catch (error) {
      console.error("Failed to fetch assets", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Basic debounce for search input
    const delayDebounceFn = setTimeout(() => {
      fetchAssets();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, category]);

  const openAddDialog = () => {
    setEditingAssetId(null);
    setFormData(INITIAL_FORM_DATA);
    setIsDialogOpen(true);
  };

  const openEditDialog = (asset: Asset) => {
    setEditingAssetId(asset.id);
    setFormData({
      tag: asset.tag,
      brand: asset.brand,
      model: asset.model,
      serialNumber: asset.serialNumber,
      purchaseCost: asset.purchaseCost.toString(),
      category: asset.category,
      status: asset.status,
      notes: asset.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      const payload = {
        ...formData,
        purchaseCost: formData.purchaseCost ? Number(formData.purchaseCost) : 0
      };

      if (editingAssetId) {
        await api.patch(`/assets/${editingAssetId}`, payload);
        toast.success("Asset updated");
      } else {
        await api.post("/assets", payload);
        toast.success("Asset created");
      }
      
      setIsDialogOpen(false);
      setFormData(INITIAL_FORM_DATA);
      setEditingAssetId(null);
      
      fetchAssets();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save asset"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this asset?")) return;
    
    try {
      await api.delete(`/assets/${id}`);
      toast.success("Asset deleted");
      fetchAssets();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete asset. It may be assigned."));
    }
  };

  const isManager = user?.role === "IT_MANAGER";

  return (
    <main className="min-h-screen bg-background px-4 sm:px-6 py-6 sm:py-8 text-foreground">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          
          {isManager && (
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" /> Add Asset
            </Button>
          )}
        </div>

        {/* Dialog for Add/Edit */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingAssetId ? "Edit Asset" : "Add New Asset"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tag">Asset Tag</Label>
                  <Input 
                    id="tag" 
                    required 
                    value={formData.tag}
                    onChange={(e) => setFormData({...formData, tag: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input 
                    id="serialNumber" 
                    required 
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input 
                    id="brand" 
                    required 
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input 
                    id="model" 
                    required 
                    value={formData.model}
                    onChange={(e) => setFormData({...formData, model: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(val) =>
                      setFormData({ ...formData, category: val ?? "LAPTOP" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(val) =>
                      setFormData({ ...formData, status: val ?? "AVAILABLE" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(stat => (
                        <SelectItem key={stat} value={stat}>{stat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaseCost">Purchase Cost ($)</Label>
                <Input 
                  id="purchaseCost" 
                  type="number"
                  step="0.01"
                  required 
                  value={formData.purchaseCost}
                  onChange={(e) => setFormData({...formData, purchaseCost: e.target.value})}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Asset"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by tag, brand, or model..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-[180px]">
                <Select value={category} onValueChange={(value) => setCategory(value ?? "ALL")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-[180px]">
                <Select value={status} onValueChange={(value) => setStatus(value ?? "ALL")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    {STATUSES.map(stat => (
                      <SelectItem key={stat} value={stat}>{stat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <span className="text-muted-foreground">Loading assets...</span>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tag</TableHead>
                      <TableHead>Brand & Model</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      {isManager && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isManager ? 6 : 5} className="h-24 text-center text-muted-foreground">
                          No assets found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      assets.map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell className="font-medium">
                            <Link
                              href={`/assets/${asset.id}`}
                              className="transition-colors hover:text-primary"
                            >
                              {asset.tag}
                            </Link>
                          </TableCell>
                          <TableCell>{asset.brand} {asset.model}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                              {asset.category}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              asset.status === 'AVAILABLE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              asset.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              asset.status === 'UNDER_REPAIR' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                              {asset.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {asset.status === "ASSIGNED" && activeAssignments[asset.id] 
                              ? activeAssignments[asset.id] 
                              : "-"}
                          </TableCell>
                          {isManager && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(asset)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(asset.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
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
      </div>
    </main>
  );
}
