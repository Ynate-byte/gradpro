"use client"

import React, { useState } from 'react';
import { Cross2Icon } from "@radix-ui/react-icons";
import { PlusCircle, Upload, Trash2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTableFacetedFilter } from "./DataTableFacetedFilter";
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

/**
 * Thanh công cụ cho DataTable, bao gồm tìm kiếm, lọc, và các hành động hàng loạt.
 * @param {object} table - Instance của table từ `useReactTable`.
 * @param {function} onAddUser - Hàm callback khi nhấn nút "Thêm mới".
 * @param {function} onImportUser - Hàm callback khi nhấn nút "Import".
 * @param {object} filterOptions - Các tùy chọn để lọc (chuyên ngành, khoa/bộ môn).
 * @param {string} activeTab - Tab đang hoạt động để hiển thị/ẩn bộ lọc.
 * @param {function} onSuccess - Hàm callback sau khi thực hiện hành động thành công.
 * @param {string} searchColumnId - ID của cột dùng để tìm kiếm.
 * @param {string} searchPlaceholder - Placeholder cho ô tìm kiếm.
 * @param {string} statusColumnId - ID của cột trạng thái.
 * @param {Array<object>} statusOptions - Các tùy chọn cho bộ lọc trạng thái.
 * @param {string} addBtnText - Văn bản cho nút "Thêm mới".
 * @param {string} searchTerm - Giá trị hiện tại của ô tìm kiếm.
 * @param {function} onSearchChange - Hàm callback khi giá trị tìm kiếm thay đổi.
 */
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
    onSearchChange = () => {},
}) {
    // State để quản lý việc hiển thị hộp thoại xác nhận
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    // State để lưu hành động hàng loạt đang được chọn (ví dụ: 'delete', 'activate')
    const [bulkAction, setBulkAction] = useState(null);

    const isFiltered = table.getState().columnFilters.length > 0;
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    
    /**
     * Thiết lập hành động và mở hộp thoại xác nhận.
     * @param {string} action - Tên của hành động ('delete', 'activate', 'deactivate', 'reset_password').
     */
    const confirmBulkAction = (action) => {
        setBulkAction(action);
        setIsAlertOpen(true);
    }

    /**
     * Xử lý thực hiện hành động hàng loạt sau khi người dùng xác nhận.
     */
    const handleBulkAction = async () => {
        const userIds = selectedRows.map(row => row.original.ID_NGUOIDUNG).filter(Boolean);

        if (userIds.length === 0) {
            toast.warning("Hành động này chỉ áp dụng cho người dùng.");
            setIsAlertOpen(false);
            return;
        }
        
        setIsAlertOpen(false); // Đóng hộp thoại

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

            table.resetRowSelection(); // Bỏ chọn tất cả các hàng
            onSuccess(); // Gọi callback để làm mới dữ liệu
        
        } catch (error) {
            toast.error("Thao tác hàng loạt thất bại. Vui lòng thử lại.");
        }
    }
    
    /**
     * Lấy nội dung (tiêu đề, mô tả) cho hộp thoại xác nhận dựa trên hành động được chọn.
     * @returns {{title: string, description: string}}
     */
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
    
    // Chuyển đổi dữ liệu từ API thành định dạng mà component `DataTableFacetedFilter` yêu cầu
    const chuyenNganhOptions = (filterOptions?.chuyenNganhs ?? []).map(cn => ({ label: cn.TEN_CHUYENNGANH, value: String(cn.ID_CHUYENNGANH) }));
    const khoaBomonOptions = (filterOptions?.khoaBomons ?? []).map(kb => ({ label: kb.TEN_KHOA_BOMON, value: String(kb.ID_KHOA_BOMON) }));
    
    return (
        <>
            <div className="flex items-center justify-between">
                <div className="flex flex-1 items-center space-x-2">
                    {/* Hiển thị các nút hành động hàng loạt khi có hàng được chọn */}
                    {selectedRows.length > 0 ? (
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
                        // Hiển thị các bộ lọc và tìm kiếm khi không có hàng nào được chọn
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
                                <DataTableFacetedFilter 
                                    column={table.getColumn(statusColumnId)} 
                                    title="Trạng thái" 
                                    options={statusOptions} 
                                />
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
                    {/* Hiển thị nút Thêm mới và Import khi không có hàng nào được chọn */}
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

            {/* Hộp thoại xác nhận hành động hàng loạt */}
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
