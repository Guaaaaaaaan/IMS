import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listUsers, updateUserRole, UserProfile, UserRole } from '../data/authApi';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Users, Shield } from 'lucide-react';

export default function UserManagement() {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await listUsers();
    if (error) {
      toast.error("Failed to fetch users");
      console.error(error);
    } else {
      setUsers(data as UserProfile[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const handleRoleUpdate = async (newRole: UserRole) => {
    if (!editingUser) return;
    
    // Prevent removing own admin access just in case, though maybe allowed
    if (editingUser.user_id === user?.id && newRole !== 'admin') {
      const confirm = window.confirm("You are about to remove your own Admin privileges. Are you sure?");
      if (!confirm) return;
    }

    const { error } = await updateUserRole(editingUser.user_id, newRole);
    if (error) {
      toast.error("Failed to update role");
      console.error(error);
    } else {
      toast.success(`Updated ${editingUser.email} to ${newRole}`);
      fetchUsers(); // refresh list
      setEditingUser(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Shield className="h-12 w-12 text-zinc-300 mb-4" />
        <h2 className="text-xl font-semibold text-zinc-900">Access Denied</h2>
        <p className="text-zinc-500 mt-2">Only administrators can manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
      </div>

      <div className="rounded-md border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-zinc-500">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-zinc-500">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.user_id || u.id}>
                  <TableCell className="font-medium">
                    {u.email}
                    {(u.user_id || u.id) === user?.id && <span className="ml-2 text-xs text-zinc-400">(You)</span>}
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={u.role} />
                  </TableCell>
                  <TableCell className="text-zinc-500 text-sm">
                    {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditingUser(u)}
                    >
                      Edit Role
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-md p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">How to add new users?</p>
        <p>
          Currently, users must be invited via the Supabase Dashboard (Authentication &gt; Users). 
          Once they sign in for the first time, they will appear in this list with a default "Viewer" role.
        </p>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Change permissions for {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-3 gap-4">
                <RoleButton 
                  current={editingUser?.role} 
                  target="viewer" 
                  onClick={() => handleRoleUpdate('viewer')}
                  description="Read-only access"
                />
                <RoleButton 
                  current={editingUser?.role} 
                  target="staff" 
                  onClick={() => handleRoleUpdate('staff')}
                  description="Can create/edit products & docs"
                />
                <RoleButton 
                  current={editingUser?.role} 
                  target="admin" 
                  onClick={() => handleRoleUpdate('admin')}
                  description="Full system access"
                />
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles = {
    admin: "bg-purple-100 text-purple-700 hover:bg-purple-100",
    staff: "bg-blue-100 text-blue-700 hover:bg-blue-100",
    viewer: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100"
  };
  return <Badge className={styles[role as keyof typeof styles] || styles.viewer}>{role}</Badge>;
}

function RoleButton({ current, target, onClick, description }: { current?: string, target: string, onClick: () => void, description: string }) {
  const isSelected = current === target;
  return (
    <div 
      onClick={onClick}
      className={`
        cursor-pointer rounded-lg border p-4 text-center transition-all hover:bg-zinc-50
        ${isSelected ? 'border-zinc-900 ring-1 ring-zinc-900 bg-zinc-50' : 'border-zinc-200'}
      `}
    >
      <div className="font-semibold capitalize mb-1">{target}</div>
      <div className="text-xs text-zinc-500 leading-tight">{description}</div>
    </div>
  );
}
