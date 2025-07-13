"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { Request } from '@/db/schema';
import dayjs from 'dayjs';
import { StatusBadge } from './StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MoreVertical, ArrowUpDown, ArrowUp, ArrowDown, FileQuestion, Clock, Paperclip, Trash2, Plus, Search, Calendar, ShoppingCart, Wrench, Loader2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useSession } from 'next-auth/react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import RequestDetailsDialog from './RequestDetailsDialog';
import { ApprovalModal } from './ApprovalModal';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RequestsTableProps {
  requests: Request[];
  isLoading?: boolean;
}

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'PR Pending' },
  { value: 'need_approved', label: 'PR Approved' },
  { value: 'finance_approved', label: 'PO Approved' },
  { value: 'awaiting_delivery', label: 'Awaiting Delivery' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const typeOptions = [
  { value: 'all', label: 'All types' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'it_ticket', label: 'IT Support' },
];

export default function RequestsTable({ requests, isLoading = false }: RequestsTableProps) {
  const { data: session } = useSession();
  const role = session?.user.role;
  const router = useRouter();
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [openDetailsId, setOpenDetailsId] = useState<string | null>(null);
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: keyof Request | 'customId'; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });
  const PAGE_SIZE = 10;
  const [isFiltering, setIsFiltering] = useState(false);
  const [approvalModal, setApprovalModal] = useState<null | {
    requestId: string;
    currentStatus: string;
  }>(null);




  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const statusMatch = status === 'all' ? true : req.status === status;
      const typeMatch = type === 'all' ? true : req.type === type;
      const searchMatch = search.trim() === '' ||
        (req.title && req.title.toLowerCase().includes(search.toLowerCase())) ||
        (req.requesterName && req.requesterName.toLowerCase().includes(search.toLowerCase())) ||
        (req.customId && req.customId.toLowerCase().includes(search.toLowerCase())) ||
        (req.id && req.id.toString().includes(search));
      const createdAt = req.createdAt ? dayjs(req.createdAt) : null;
      const startMatch = dateStart ? (createdAt && createdAt.isAfter(dayjs(dateStart).subtract(1, 'day'))) : true;
      const endMatch = dateEnd ? (createdAt && createdAt.isBefore(dayjs(dateEnd).add(1, 'day'))) : true;
      return statusMatch && typeMatch && searchMatch && startMatch && endMatch;
    });
  }, [requests, status, type, search, dateStart, dateEnd]);

  const sortedRequests = useMemo(() => {
    const arr = [...filteredRequests];
    arr.sort((a, b) => {
      let aValue = a[sort.key as keyof Request];
      let bValue = b[sort.key as keyof Request];
      if (sort.key === 'customId') {
        aValue = a.customId || '';
        bValue = b.customId || '';
      }
      if (aValue === undefined || bValue === undefined) return 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sort.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sort.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      if (aValue instanceof Date && bValue instanceof Date) {
        return sort.direction === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }
      return 0;
    });
    return arr;
  }, [filteredRequests, sort]);

  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedRequests.slice(start, start + PAGE_SIZE);
  }, [sortedRequests, page]);

  const totalPages = Math.ceil(filteredRequests.length / PAGE_SIZE);
  const totalFiltered = filteredRequests.length;

  useEffect(() => { setPage(1); }, [status, type, search]);

  useEffect(() => {
    setIsFiltering(true);
    const timeout = setTimeout(() => setIsFiltering(false), 350);
    return () => clearTimeout(timeout);
  }, [status, type, search, dateStart, dateEnd, sort, page]);

  const handleSort = (key: keyof Request | 'customId') => {
    setSort(prev =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  const handleClearFilters = () => {
    setStatus('all');
    setType('all');
    setSearch('');
    setDateStart('');
    setDateEnd('');
  };



  if (isLoading || isFiltering) {
    return (
      <div className="w-full overflow-x-auto rounded-md border bg-white dark:bg-zinc-900">
        <table className="min-w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2 text-left whitespace-nowrap text-[13px] font-semibold w-32">ID</th>
              <th className="px-4 py-2 text-left whitespace-nowrap text-[13px] max-w-xs">Title</th>
              <th className="px-4 py-2 text-left whitespace-nowrap text-[13px] font-semibold w-24">Type</th>
              <th className="px-4 py-2 text-left whitespace-nowrap text-[13px] font-semibold w-24">Status</th>
              <th className="px-4 py-2 text-left whitespace-nowrap text-[13px] max-w-xs">Requester</th>
              <th className="px-4 py-2 text-left whitespace-nowrap text-[13px] font-semibold w-32" onClick={() => handleSort('createdAt')}>Date {sort.key === 'createdAt' ? (sort.direction === 'asc' ? <ArrowUp className="inline w-4 h-4 ml-1 text-primary" /> : <ArrowDown className="inline w-4 h-4 ml-1 text-primary" />) : <ArrowUpDown className="inline w-4 h-4 ml-1 text-muted-foreground" />}</th>
              <th className="px-4 py-2 text-left whitespace-nowrap text-[13px] font-semibold w-24">Attachments</th>
              <th className="px-4 py-2 text-left whitespace-nowrap text-[13px] font-semibold w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b">
                <td className="px-4 py-2"><Skeleton className="h-4 w-16" /></td>
                <td className="px-4 py-2 max-w-xs"><Skeleton className="h-4 w-32" /></td>
                <td className="px-4 py-2"><Skeleton className="h-4 w-20" /></td>
                <td className="px-4 py-2"><Skeleton className="h-4 w-20" /></td>
                <td className="px-4 py-2 max-w-xs"><Skeleton className="h-4 w-24" /></td>
                <td className="px-4 py-2"><Skeleton className="h-4 w-24" /></td>
                <td className="px-4 py-2"><Skeleton className="h-4 w-24" /></td>
                <td className="px-4 py-2"><Skeleton className="h-8 w-16 rounded" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-primary">Filtering...</span>
        </div>
      </div>
    );
  }

  if (!requests || requests.length === 0 || totalFiltered === 0) {
    return (
      <div className="border rounded-md p-8 bg-white dark:bg-zinc-900 flex flex-col items-center justify-center gap-2">
        <FileQuestion className="w-10 h-10 text-muted-foreground mb-2" />
        <p className="text-center text-muted-foreground font-medium">No requests found with current filters.</p>
        <p className="text-center text-xs text-muted-foreground">Try adjusting filters or clearing all to see more results.</p>
      </div>
    );
  }

  return (
    <div>
      {role === 'admin' && (
        <div className="mb-4 p-2 rounded bg-green-100 text-green-800 text-sm font-medium">Admin view: you can see and manage all requests.</div>
      )}
      {role === 'supervisor' && (
        <div className="mb-4 p-2 rounded bg-blue-100 text-blue-800 text-sm font-medium">Supervisor view: you can approve, reject, and forward requests.</div>
      )}
      {role === 'manager' && (
        <div className="mb-4 p-2 rounded bg-yellow-100 text-yellow-800 text-sm font-medium">Manager view: you can execute and complete requests from your department.</div>
      )}
      {role === 'user' && (
        <div className="mb-4 p-2 rounded bg-gray-100 text-gray-800 text-sm font-medium">User view: you can create and query your own requests.</div>
      )}
      {role === 'user' && (
        <div className="flex justify-end mb-4">
          <Button
            variant="default"
            className="gap-2"
            onClick={() => router.push('/requests/add?type=purchase')}
          >
            <Plus className="w-5 h-5" /> New Request
          </Button>
        </div>
      )}
      <div className="mb-2 text-sm text-muted-foreground">
        {totalFiltered === 1 ? '1 request found' : `${totalFiltered} requests found`}
      </div>
      <div className="flex flex-wrap gap-2 mb-4 items-end w-full sm:flex-col md:flex-row">
        <div className="relative w-full sm:w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by ID or status"
            className="pl-9 pr-3 py-2 text-sm rounded-md"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative w-full sm:w-40">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateStart}
            onChange={e => setDateStart(e.target.value)}
            className="pl-10 pr-4 w-full"
          />
        </div>
        <div className="relative w-full sm:w-40">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateEnd}
            onChange={e => setDateEnd(e.target.value)}
            className="pl-10 pr-4 w-full"
          />
        </div>
        <Button variant="ghost" onClick={handleClearFilters} className="ml-0 sm:ml-2 flex items-center gap-1 text-destructive min-h-10 min-w-10">
          <XCircle className="w-4 h-4" /> Clear Filters
        </Button>
      </div>
      <div className="w-full overflow-x-auto bg-white rounded-2xl shadow-md border border-muted p-4 md:p-6">
        <AnimatePresence mode="wait">
          <motion.table
            key={JSON.stringify([status, type, search, dateStart, dateEnd, sort, page])}
            className="min-w-[600px] text-sm w-full table-fixed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left whitespace-nowrap text-[13px] font-semibold w-32">ID</th>
                <th className="px-4 py-2 text-left whitespace-nowrap text-[13px] font-semibold w-24">Type</th>
                <th className="px-4 py-2 text-left whitespace-nowrap text-[13px] font-semibold hidden md:table-cell w-32">Status</th>
                <th className="px-4 py-2 text-left whitespace-nowrap text-[13px] font-semibold w-full" onClick={() => handleSort('requesterName')}>Requester {sort.key === 'requesterName' ? (sort.direction === 'asc' ? <ArrowUp className="inline w-4 h-4 ml-1 text-primary" /> : <ArrowDown className="inline w-4 h-4 ml-1 text-primary" />) : <ArrowUpDown className="inline w-4 h-4 ml-1 text-muted-foreground" />}</th>
                <th className="px-4 py-2 text-left whitespace-nowrap text-[13px] font-semibold w-32" onClick={() => handleSort('createdAt')}>Date {sort.key === 'createdAt' ? (sort.direction === 'asc' ? <ArrowUp className="inline w-4 h-4 ml-1 text-primary" /> : <ArrowDown className="inline w-4 h-4 ml-1 text-primary" />) : <ArrowUpDown className="inline w-4 h-4 ml-1 text-muted-foreground" />}</th>
                <th className="px-4 py-2 text-left whitespace-nowrap text-[13px] font-semibold w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRequests.map((req) => (
                <tr key={req.id} className="border-b border-muted hover:bg-muted/50 align-middle text-[13px]">
                  <td className="px-4 py-2 w-32">{req.customId || req.id}</td>
                  <td className="px-4 py-2 w-24 flex items-center justify-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            {req.type === 'purchase' && (
                              <ShoppingCart
                                className={`w-5 h-5 ${req.priority === 'high' ? 'text-red-600' : req.priority === 'medium' ? 'text-yellow-500' : req.priority === 'low' ? 'text-green-600' : 'text-primary'}`}
                                aria-label="Purchase"
                              />
                            )}
                            {req.type === 'maintenance' && (
                              <Wrench
                                className={`w-5 h-5 ${req.priority === 'high' ? 'text-red-600' : req.priority === 'medium' ? 'text-yellow-500' : req.priority === 'low' ? 'text-green-600' : 'text-yellow-600'}`}
                                aria-label="Maintenance"
                              />
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{req.type === 'purchase' ? 'Purchase' : req.type === 'maintenance' ? 'Maintenance' : 'IT Support'}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  <td className="px-4 py-2 hidden md:table-cell w-32">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-4 py-2 w-full truncate">{req.requesterName}</td>
                  <td className="px-4 py-2 w-32">{dayjs(req.createdAt).format('DD/MM/YYYY HH:mm')}</td>
                  <td className="px-4 py-2 w-24 space-x-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded hover:bg-muted transition" aria-label="Actions">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuItem onClick={() => setOpenDetailsId(req.customId)}>
                                View Details
                              </DropdownMenuItem>
                            </TooltipTrigger>
                            <TooltipContent>View all request data</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuItem onClick={() => setOpenHistoryId(req.customId)}>
                                <Clock className="w-4 h-4 mr-2 text-muted-foreground" /> View History
                              </DropdownMenuItem>
                            </TooltipTrigger>
                            <TooltipContent>View status history</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {(role !== 'user') && ['pending', 'need_approved', 'finance_approved', 'in_progress'].includes(req.status) && (
                          <>
                            <DropdownMenuItem
                              onClick={() => setApprovalModal({
                                requestId: req.customId || req.id.toString(),
                                currentStatus: req.status,
                              })}
                            >
                              Manage Status
                            </DropdownMenuItem>
                          </>
                        )}

                      </DropdownMenuContent>
                    </DropdownMenu>
                    <RequestDetailsDialog requestId={req.customId || req.id.toString()} open={openDetailsId === req.customId} onOpenChange={() => setOpenDetailsId(null)} />
                    <Dialog open={openHistoryId === req.customId} onOpenChange={() => setOpenHistoryId(null)}>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Status History</DialogTitle>
                        </DialogHeader>
                        <div className="py-2">
                          {Array.isArray(req.statusHistory) && req.statusHistory.length > 0 ? (
                            <ol className="relative border-l border-muted-foreground/30 ml-2">
                              {req.statusHistory.map((h, idx) => (
                                <li key={idx} className="mb-6 ml-4">
                                  <div className="absolute w-3 h-3 bg-primary rounded-full -left-1.5 border-2 border-white" />
                                  <div className="flex items-center gap-2">
                                    {h.status === 'attachment_added' ? (
                                      <Paperclip className="w-4 h-4 text-blue-500" />
                                    ) : h.status === 'attachment_removed' ? (
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    ) : (
                                      <StatusBadge status={h.status as 'pending' | 'need_approved' | 'finance_approved' | 'rejected' | 'in_progress' | 'completed'} />
                                    )}
                                    <span className="text-[13px] text-muted-foreground">
                                      {h.status === 'attachment_added' && 'Attachment added'}
                                      {h.status === 'attachment_removed' && 'Attachment removed'}
                                      {h.status !== 'attachment_added' && h.status !== 'attachment_removed' && null}
                                    </span>
                                    <span className="text-[13px] text-muted-foreground">{dayjs(h.changedAt).format('DD/MM/YYYY HH:mm')}</span>
                                  </div>
                                  <div className="text-[13px] text-muted-foreground mt-1">
                                    by <span className="font-medium text-foreground">{h.changedBy}</span>
                                    {h.comment && (
                                      <div className="mt-1 text-[13px] italic text-muted-foreground">Comment: {h.comment}</div>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <div className="text-[13px] text-muted-foreground">No history recorded for this request.</div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </motion.table>
        </AnimatePresence>
        <div className="flex items-center justify-between mt-4">
          <span className="text-[13px] text-muted-foreground">
            Displaying {paginatedRequests.length} of {filteredRequests.length} requests
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-[13px] px-2">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        </div>
      </div>


      {/* Approval Modal */}
      {approvalModal && (
        <ApprovalModal
          open={!!approvalModal}
          onOpenChange={(open) => !open && setApprovalModal(null)}
          requestId={approvalModal.requestId}
          currentStatus={approvalModal.currentStatus}
          userRole={role || 'user'}
          userName={session?.user?.name || 'User'}
        />
      )}
    </div>
  );
} 