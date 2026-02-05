import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { listAuditLogs, AuditLog } from '../data/auditApi';
import { useAuth } from '../context/AuthContext';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { toast } from 'sonner';

export default function AuditLogs() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    
    const fetchLogs = async () => {
      setLoading(true);
      const { data, error } = await listAuditLogs();
      if (error) {
        console.error(error);
        toast.error('Failed to load audit logs');
      } else if (data) {
        setLogs(data);
      }
      setLoading(false);
    };

    fetchLogs();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-xl font-semibold text-zinc-900">Access Denied</h2>
        <p className="text-zinc-500 mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <Badge variant="outline" className="text-zinc-500">
          Last {logs.length} records
        </Badge>
      </div>

      <div className="rounded-md border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[150px]">Actor</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
              <TableHead className="w-[150px]">Table</TableHead>
              <TableHead>Record ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-zinc-500">
                  Loading logs...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-zinc-500">
                  No activity found.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log, idx) => (
                <TableRow 
                  key={log.id || idx} 
                  className="cursor-pointer hover:bg-zinc-50"
                  onClick={() => setSelectedLog(log)}
                >
                  <TableCell className="font-mono text-xs text-zinc-600">
                    {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell className="text-sm">{log.actor_email}</TableCell>
                  <TableCell>
                    <Badge variant={
                      log.action === 'DELETE' ? 'destructive' : 
                      log.action === 'INSERT' ? 'default' : 
                      'secondary'
                    }>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.table_name}</TableCell>
                  <TableCell className="font-mono text-xs text-zinc-500 max-w-[200px] truncate">
                    {log.record_id}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Detail</DialogTitle>
            <DialogDescription>
              {selectedLog?.action} on {selectedLog?.table_name} by {selectedLog?.actor_email}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
               {/* Prefer 'changes' structure if available, otherwise raw payload */}
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <h4 className="text-xs font-semibold uppercase text-zinc-500">Before</h4>
                   <pre className="text-xs bg-zinc-50 p-4 rounded border border-zinc-100 overflow-x-auto">
                     {selectedLog.changes?.before 
                       ? JSON.stringify(selectedLog.changes.before, null, 2)
                       : 'N/A'
                     }
                   </pre>
                 </div>
                 <div className="space-y-2">
                   <h4 className="text-xs font-semibold uppercase text-zinc-500">After</h4>
                   <pre className="text-xs bg-zinc-50 p-4 rounded border border-zinc-100 overflow-x-auto">
                     {selectedLog.changes?.after 
                       ? JSON.stringify(selectedLog.changes.after, null, 2)
                       : JSON.stringify(selectedLog.payload || {}, null, 2)
                     }
                   </pre>
                 </div>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
