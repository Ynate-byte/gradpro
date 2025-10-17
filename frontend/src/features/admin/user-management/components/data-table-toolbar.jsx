"use client"

import React, { useState } from 'react';
import { Cross2Icon } from "@radix-ui/react-icons"
import { PlusCircle, Upload, Trash2, KeyRound } from "lucide-react" 
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableFacetedFilter } from "./data-table-faceted-filter"
import { performBulkAction, performBulkDelete, bulkResetPassword } from "@/api/userService" 
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

export function DataTableToolbar({ 
    table, 
    onAddUser, 
    onImportUser, 
    filterOptions, 
    activeTab, 
    onSuccess,
    searchColumnId,
    searchPlaceholder,
    statusColumnId,
    statusOptions,
    addBtnText,
    searchTerm,
    // === BẮT ĐẦU SỬA LỖI: Thêm giá trị mặc định để tránh lỗi ===
    onSearchChange = () => {},
    // === KẾT THÚC SỬA LỖI ===
}) {
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [bulkAction, setBulkAction] = useState(null);

    const isFiltered = table.getState().columnFilters.length > 0
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
            } 
            else if (bulkAction === 'reset_password') {
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
            case 'activate':
                return { title: 'Xác nhận Kích hoạt Tài khoản?', description: `Bạn có chắc chắn muốn kích hoạt ${count} tài khoản đã chọn không?` };
            case 'deactivate':
                return { title: 'Xác nhận Vô hiệu hóa Tài khoản?', description: `Bạn có chắc chắn muốn vô hiệu hóa ${count} tài khoản đã chọn không? Người dùng sẽ không thể đăng nhập.` };
            case 'delete':
                return { title: 'Xác nhận Xóa Vĩnh Viễn?', description: `Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa vĩnh viễn ${count} tài khoản đã chọn không?` };
            case 'reset_password':
                return { title: 'Xác nhận Reset Mật khẩu?', description: `Bạn có chắc chắn muốn reset mật khẩu về mặc định cho ${count} tài khoản đã chọn không?` };
            default:
                return { title: '', description: '' };
        }
    }
    const dialogContent = getDialogContent();
    
    const chuyenNganhOptions = (filterOptions?.chuyenNganhs ?? []).map(cn => ({ label: cn.TEN_CHUYENNGANH, value: String(cn.ID_CHUYENNGANH) }));
    const khoaBomonOptions = (filterOptions?.khoaBomons ?? []).map(kb => ({ label: kb.TEN_KHOA_BOMON, value: String(kb.ID_KHOA_BOMON) }));
    
    return (
        <>
            <div className="flex items-center justify-between">
                <div className="flex flex-1 items-center space-x-2">
                    {selectedRows.length > 0 ? (
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-8" onClick={() => confirmBulkAction('reset_password')}>
                                <KeyRound className="mr-2 h-4 w-4" /> Reset Mật khẩu ({selectedRows.length})
                            </Button>
                            <Button variant="outline" size="sm" className="h-8" onClick={() => confirmBulkAction('activate')}>Kích hoạt ({selectedRows.length})</Button>
                            <Button variant="outline" size="sm" className="h-8" onClick={() => confirmBulkAction('deactivate')}>Vô hiệu hóa ({selectedRows.length})</Button>
                            <Button variant="destructive" size="sm" className="h-8" onClick={() => confirmBulkAction('delete')}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Xóa ({selectedRows.length})
                            </Button>
                        </div>
                    ) : (
                        <>
                            {searchColumnId && (
                                <Input
                                    placeholder={searchPlaceholder}
                                    value={searchTerm}
                                    onChange={(event) => onSearchChange(event.target.value)}
                                    className="h-8 w-[150px] lg:w-[250px]"
                                />
                            )}
                            {(activeTab === 'Tất cả' || activeTab === 'Sinh viên') && (
                                <DataTableFacetedFilter
                                    column={table.getColumn("chuyen_nganh")}
                                    title="Chuyên ngành"
                                    options={chuyenNganhOptions}
                                />
                            )}
                            {(activeTab === 'Tất cả' || activeTab === 'Giảng viên') && (
                                <DataTableFacetedFilter
                                    column={table.getColumn("khoa_bomon")}
                                    title="Khoa/Bộ môn"
                                    options={khoaBomonOptions}
                                />
                            )}
                            {statusColumnId && statusOptions && (
                                <DataTableFacetedFilter column={table.getColumn(statusColumnId)} title="Trạng thái" options={statusOptions} />
                            )}
                            {isFiltered && (
                                <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
                                    Reset <Cross2Icon className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </>
                    )}
                </div>

                <div className="flex items-center space-x-2">
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