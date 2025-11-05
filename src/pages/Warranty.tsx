import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { formatPakistanDate } from "@/lib/utils";

const Warranty = () => {
  const [claims, setClaims] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadClaims();
  }, [statusFilter]);

  const loadClaims = async () => {
    let query = supabase.from("warranty_claims").select("*").order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;
    if (data) setClaims(data);
  };

  const filteredClaims = claims.filter(
    (claim) =>
      claim.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.customer_phone?.includes(searchQuery) ||
      claim.order_number?.includes(searchQuery)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "default";
      case "pending":
        return "secondary";
      case "in_progress":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Warranty Claims</h1>
          <p className="text-muted-foreground">Manage product warranty and repair requests</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer, phone, or order..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Issue Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClaims.map((claim) => (
                  <TableRow key={claim.claim_id}>
                    <TableCell className="font-medium">{claim.customer_name || "—"}</TableCell>
                    <TableCell>{claim.customer_phone || "—"}</TableCell>
                    <TableCell>{claim.order_number || "—"}</TableCell>
                    <TableCell>{claim.product_name}</TableCell>
                    <TableCell>{claim.issue_type || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(claim.status)}>{claim.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {formatPakistanDate(claim.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Warranty;