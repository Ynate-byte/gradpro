"use client"

import React, { useState } from 'react';
import { Cross2Icon } from "@radix-ui/react-icons";
import { SlidersHorizontal, PlusCircle, Upload, Trash2, KeyRound } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandList, CommandSeparator, CommandItem } from "@/components/ui/command";
import { DataTableFacetedFilterGroup } from "./DataTableFacetedFilterGroup";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { performBulkAction, performBulkDelete, bulkResetPassword } from "@/api/userService";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';

export function DataTableToolbar({
  table,
  onAddUser, // <-- Dùng prop này làm cờ (flag)
  onImportUser,
  onSuccess,
  searchColumnId,
  searchPlaceholder,
  statusColumnId,
  statusOptions,
  typeFilterColumnId,
  typeFilterOptions,
  addBtnText,
  searchTerm,
  onSearchChange = () => {},
  khoahocFilterOptions,
  namhocFilterOptions,
  hockyFilterOptions,
  hedaotaoFilterOptions,
  chuyenNganhFilterColumnId,
  chuyenNganhFilterOptions,
  khoaBomonFilterColumnId,
  khoaBomonFilterOptions,
}) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  
  const confirmBulkAction = (action) => {
    setBulkAction(action);
    setIsAlertOpen(true);
  }
  const handleBulkAction = async () => {
    const userIds = selectedRows.map(row => row.original.ID_NGUOIDUNG).filter(Boolean);
    if (userIds.length === 0) {
        toast.warning("Hành động này chỉ áp dụng cho người dùng.");
        setIsAlertOpen(false);
        return;
    }
    setIsAlertOpen(false);
    try {
        if (bulkAction === 'activate' || bulkAction === 'deactivate') {
            const actionText = bulkAction === 'activate' ? 'Kích hoạt' : 'Vô hiệu hóa';
            await performBulkAction({ action: bulkAction, userIds });
            toast.success(`Đã ${actionText} thành công ${userIds.length} tài khoản.`);
        } else if (bulkAction === 'delete') {
            await performBulkDelete(userIds);
            toast.success(`Đã xóa vĩnh viễn ${userIds.length} tài khoản.`);
        } else if (bulkAction === 'reset_password') {
            await bulkResetPassword(userIds);
            toast.success(`Đã reset mật khẩu cho ${userIds.length} tài khoản.`);
        }
        table.resetRowSelection();
        onSuccess();
    } catch (error) {
        toast.error("Thao tác hàng loạt thất bại. Vui lòng thử lại.");
    }
  }
  const getDialogContent = () => {
    if (!bulkAction) return { title: '', description: '' };
    const count = selectedRows.length;
    switch (bulkAction) {
        case 'activate': return { title: 'Xác nhận Kích hoạt Tài khoản?', description: `Bạn có chắc chắn muốn kích hoạt ${count} tài khoản đã chọn không?` };
        case 'deactivate': return { title: 'Xác nhận Vô hiệu hóa Tài khoản?', description: `Bạn có chắc chắn muốn vô hiệu hóa ${count} tài khoản đã chọn không? Người dùng sẽ không thể đăng nhập.` };
        case 'delete': return { title: 'Xác nhận Xóa Vĩnh Viễn?', description: `Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa vĩnh viễn ${count} tài khoản đã chọn không?` };
        case 'reset_password': return { title: 'Xác nhận Reset Mật khẩu?', description: `Bạn có chắc chắn muốn reset mật khẩu về mặc định cho ${count} tài khoản đã chọn không?` };
        default: return { title: '', description: '' };
    }
  }
  const dialogContent = getDialogContent();
  
  const activeFilterCount = table.getState().columnFilters.filter(
    f => f.id !== searchColumnId
  ).length;
  const isFiltered = activeFilterCount > 0;
  
  const hasFacetedFilters =
    (chuyenNganhFilterOptions) ||
    (khoaBomonFilterOptions) ||
    (statusColumnId && statusOptions) ||
    (typeFilterColumnId && typeFilterOptions) ||
    (khoahocFilterOptions) || (namhocFilterOptions) ||
    (hockyFilterOptions) || (hedaotaoFilterOptions);

  // Xây dựng mảng các bộ lọc
  const filterGroups = [
    (chuyenNganhFilterOptions) ? (
        <DataTableFacetedFilterGroup
            key="chuyen_nganh_filter"
            column={table.getColumn(chuyenNganhFilterColumnId || "chuyen_nganh_id")}
            title="Chuyên ngành"
            options={chuyenNganhFilterOptions}
            className="min-w-[200px]"
        />
    ) : null,
    
    (khoaBomonFilterOptions) ? (
        <DataTableFacetedFilterGroup
            key="khoa_bomon_filter"
            column={table.getColumn(khoaBomonFilterColumnId || "khoa_bomon_id")}
            title="Khoa/Bộ môn"
            options={khoaBomonFilterOptions}
            className="min-w-[200px]"
        />
    ) : null,

    (statusColumnId && statusOptions) ? (
        <DataTableFacetedFilterGroup
            key="status_filter"
            column={table.getColumn(statusColumnId)}
            title="Trạng thái"
            options={statusOptions}
            className="min-w-[200px]"
        />
    ) : null,

    (typeFilterColumnId && typeFilterOptions) ? (
        <DataTableFacetedFilterGroup
            key="type_filter"
            column={table.getColumn(typeFilterColumnId)}
            title="Loại nhóm"
            options={typeFilterOptions}
            className="min-w-[200px]"
        />
    ) : null,
    (khoahocFilterOptions) ? (
        <DataTableFacetedFilterGroup
            key="khoahoc_filter"
            column={table.getColumn("KHOAHOC")}
            title="Khóa học"
            options={khoahocFilterOptions}
            className="min-w-[200px]"
        />
    ) : null,
    (namhocFilterOptions) ? (
        <DataTableFacetedFilterGroup
            key="namhoc_filter"
            column={table.getColumn("NAMHOC")}
            title="Năm học"
            options={namhocFilterOptions}
            className="min-w-[200px]"
        />
    ) : null,
    (hockyFilterOptions) ? (
        <DataTableFacetedFilterGroup
            key="hocky_filter"
            column={table.getColumn("HOCKY")}
            title="Học kỳ"
            options={hockyFilterOptions}
            className="min-w-[200px]"
        />
    ) : null,
    (hedaotaoFilterOptions) ? (
        <DataTableFacetedFilterGroup
            key="hedaotao_filter"
            column={table.getColumn("HEDAOTAO")}
            title="Hệ đào tạo"
            options={hedaotaoFilterOptions}
            className="min-w-[200px]"
        />
    ) : null,
  ].filter(Boolean);

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center flex-wrap gap-2">

          {/* ----- SỬA ĐỔI CHÍNH Ở ĐÂY ----- */}
          {/* Chỉ hiển thị nút bulk actions nếu CÓ HÀNG ĐƯỢC CHỌN và LÀ TRANG ADMIN (có prop onAddUser) */}
          {selectedRows.length > 0 && onAddUser ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8" onClick={() => confirmBulkAction('reset_password')}>
                <KeyRound className="mr-2 h-4 w-4" /> Reset Mật khẩu ({selectedRows.length})
              </Button>
              <Button variant="outline" size="sm" className="h-8" onClick={() => confirmBulkAction('activate')}>
                Kích hoạt ({selectedRows.length})
              </Button>
              <Button variant="outline" size="sm" className="h-8" onClick={() => confirmBulkAction('deactivate')}>
                Vô hiệu hóa ({selectedRows.length})
              </Button>
              <Button variant="destructive" size="sm" className="h-8" onClick={() => confirmBulkAction('delete')}>
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa ({selectedRows.length})
              </Button>
            </div>
          ) : (
            /* Nếu không, hiển thị thanh tìm kiếm và bộ lọc */
            <>
              {searchColumnId && (
                <Input
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(event) => onSearchChange(event.target.value)}
                  className="h-8 w-[150px] lg:w-[250px]"
                />
              )}

              {hasFacetedFilters && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 border-dashed">
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      Bộ lọc
                      {isFiltered && (
                        <span className={cn(
                          "ml-2 rounded-full px-2 py-0.5 text-xs",
                          activeFilterCount > 0
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto max-w-[calc(100vw-32px)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Tìm bộ lọc..." />
                      <CommandList>
                        <CommandEmpty>Không tìm thấy.</CommandEmpty>
                        
                        <div className="flex flex-col md:flex-row p-2 max-h-[300px] overflow-x-auto">
                          {filterGroups.map((groupComponent, index) => (
                            <React.Fragment key={groupComponent.key}>
                              {index > 0 && <Separator orientation="vertical" className="h-auto hidden md:block mx-2" />}
                              {index > 0 && <Separator orientation="horizontal" className="w-full md:hidden my-2" />}
                              {groupComponent}
                            </React.Fragment>
                          ))}
                        </div>

                        {isFiltered && (
                          <>
                            <CommandSeparator />
                            <CommandItem
                              onSelect={() => table.resetColumnFilters()}
                              className="justify-center text-center text-destructive opacity-90"
                            >
                              Xóa tất cả bộ lọc
                            </CommandItem>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              
              {isFiltered && !hasFacetedFilters && (
                <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
                  Reset <Cross2Icon className="ml-2 h-4 w-4" />
                </Button>
              )}
            </>
          )}
          {/* ----- KẾT THÚC SỬA ĐỔI ----- */}
        </div>

        <div className="flex items-center space-x-2">
          {/* Logic này vẫn đúng, vì `onAddUser` chỉ có ở trang Admin */}
          {selectedRows.length === 0 && onAddUser && (
            <>
              {onImportUser && (
                <Button variant="outline" size="sm" className="h-8" onClick={onImportUser}>
                  <Upload className="mr-2 h-4 w-4" /> Import
                </Button>
              )}
              <Button size="sm" className="h-8" onClick={onAddUser}>
                <PlusCircle className="mr-2 h-4 w-4" /> {addBtnText}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* AlertDialog (Không đổi) */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
                <AlertDialogDescription>{dialogContent.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleBulkAction}
                    className={bulkAction === 'delete' ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                >
                    Xác nhận
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}