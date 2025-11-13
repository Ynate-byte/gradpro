import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { searchAvailableStudents, inviteMultipleMembers } from '@/api/groupService';
import { getChuyenNganhs } from '@/api/userService';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/shared/data-table/DataTable';
import { Checkbox } from "@/components/ui/checkbox";
import { useDebounce } from 'use-debounce';
import { Alert, AlertDescription } from "@/components/ui/alert";

const inviteSchema = z.object({
  LOINHAN: z.string().max(150, 'Lời nhắn không quá 150 ký tự.').optional(),
});

export function InviteMemberDialog({ isOpen, setIsOpen, groupId, planId, groupData }) {
  const queryClient = useQueryClient();
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [debouncedSearch] = useDebounce(globalFilter, 300);
  const [columnFilters, setColumnFilters] = useState([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5,
  });

  const form = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: { LOINHAN: '' },
  });

  const { data: chuyenNganhs } = useQuery({
    queryKey: ['chuyenNganhs'],
    queryFn: getChuyenNganhs,
    staleTime: Infinity,
  });

  const chuyenNganhFilterOptions = useMemo(() =>
    chuyenNganhs?.map(cn => ({
      label: cn.TEN_CHUYENNGANH,
      value: cn.ID_CHUYENNGANH.toString(),
    })) || [],
    [chuyenNganhs]
  );

  const { data: studentsData, isLoading } = useQuery({
    queryKey: [
      'availableStudents',
      planId,
      debouncedSearch,
      columnFilters,
      pagination
    ],
    queryFn: () => {
      const filters = columnFilters.reduce((acc, filter) => {
        acc[filter.id] = filter.value;
        return acc;
      }, {});

      return searchAvailableStudents(planId, {
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        search: debouncedSearch,
        chuyen_nganh_ids: filters.chuyen_nganh_id,
      });
    },
    enabled: !!planId && isOpen,
  });

  const inviteMutation = useMutation({
    mutationFn: ({ userIds, message }) => inviteMultipleMembers(groupId, userIds, message),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['myGroupDetails', planId] });
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Gửi lời mời thất bại.");
    }
  });

  const columns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'HODEM_VA_TEN',
      header: 'Họ và tên',
    },
    {
      accessorKey: 'MA_DINHDANH',
      header: 'MSSV',
    },
    {
      id: 'chuyen_nganh_id',
      accessorFn: row => row.sinhvien?.chuyennganh?.TEN_CHUYENNGANH,
      header: 'Chuyên ngành',
    },
  ], []);

  // --- NÂNG CẤP: Tính toán giới hạn ---
  const selectedRowCount = Object.keys(rowSelection).length;
  // const currentMemberCount = groupData?.SO_THANHVIEN_HIENTAI || 0; // <-- KHÔNG CẦN NỮA
  const pendingInviteCount = groupData?.loimois?.filter(
    inv => inv.TRANGTHAI === 'Đang chờ'
  ).length || 0;

  // const totalMembersIfInvited = currentMemberCount + selectedRowCount; // <-- KHÔNG CẦN NỮA
  const totalPendingIfInvited = pendingInviteCount + selectedRowCount;

  // const isOverMemberLimit = totalMembersIfInvited > 4; // <-- KHÔNG CẦN NỮA
  const isOverInviteLimit = totalPendingIfInvited > 8; // <-- GIỮ LẠI
  // --- KẾT THÚC NÂNG CẤP ---

  const onSubmit = (data) => {
    const selectedUserIds = Object.keys(rowSelection)
      .map(index => studentsData?.data[index]?.ID_NGUOIDUNG)
      .filter(Boolean);

    if (selectedUserIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một sinh viên để mời.");
      return;
    }

    // --- NÂNG CẤP: Kiểm tra lại trước khi gửi ---
    // if (isOverMemberLimit) { ... } // <-- ĐÃ GỠ BỎ
    
    if (isOverInviteLimit) {
      toast.error(`Nhóm chỉ được có 8 lời mời chờ. (Hiện tại: ${pendingInviteCount})`);
      return;
    }
    // --- KẾT THÚC NÂNG CẤP ---

    inviteMutation.mutate({ userIds: selectedUserIds, message: data.LOINHAN });
  };

  useEffect(() => {
    if (isOpen) {
      form.reset();
      setRowSelection({});
      setGlobalFilter('');
      setColumnFilters([]);
      setPagination({ pageIndex: 0, pageSize: 5 });
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Mời thành viên</DialogTitle>
          <DialogDescription>
            Tìm kiếm, lọc và chọn các sinh viên chưa có nhóm trong kế hoạch này để gửi lời mời.
          </DialogDescription>
        </DialogHeader>
        
        <DataTable
          className="flex-1 min-h-0"
          flexLayout={true}
          columns={columns}
          data={studentsData?.data}
          pageCount={studentsData?.last_page || 0}
          loading={isLoading}
          pagination={pagination}
          setPagination={setPagination}
          columnFilters={columnFilters}
          setColumnFilters={setColumnFilters}
          onRowSelectionChange={setRowSelection}
          state={{ rowSelection }}
          searchColumnId="HODEM_VA_TEN"
          searchPlaceholder="Tìm theo tên, MSSV..."
          searchTerm={globalFilter}
          onSearchChange={setGlobalFilter}
          chuyenNganhFilterColumnId="chuyen_nganh_id"
          chuyenNganhFilterOptions={chuyenNganhFilterOptions}
        />

        {/* Form lời nhắn và nút gửi */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 border-t">
            
            {/* --- GỠ BỎ ALERT GIỚI HẠN THÀNH VIÊN --- */}
            
            {isOverInviteLimit && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Quá số lượng lời mời chờ! Nhóm của bạn đã có {pendingInviteCount}/8 lời mời đang chờ.
                  Bạn chỉ có thể mời thêm {8 - pendingInviteCount} người.
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="LOINHAN"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lời nhắn (Tùy chọn)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Vào nhóm tớ nhé..." className="resize-none" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
              <Button 
                type="submit" 
                disabled={
                  inviteMutation.isPending || 
                  selectedRowCount === 0 ||
                  // isOverMemberLimit || // <-- ĐÃ GỠ BỎ
                  isOverInviteLimit // <-- Giữ lại
                }
              >
                {inviteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Gửi lời mời ({selectedRowCount})
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}