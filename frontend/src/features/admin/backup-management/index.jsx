import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Download, Trash2, Database, HardDrive, Loader2, 
    ShieldCheck, AlertTriangle, ChevronDown, FileArchive, 
    RotateCcw, Clock, Archive 
} from 'lucide-react';
import { getBackups, createBackup, deleteBackup, downloadBackupLink, restoreBackup } from '@/api/adminBackupService';
import { toast } from 'sonner';

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';

export default function BackupPage() {
    const queryClient = useQueryClient();
    
    // State cho Dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [backupToDelete, setBackupToDelete] = useState(null);
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
    const [backupToRestore, setBackupToRestore] = useState(null);

    // 1. Lấy danh sách backup
    const { data: backups, isLoading } = useQuery({
        queryKey: ['backups'],
        queryFn: getBackups,
    });

    // 2. Tạo Backup Mới
    const createBackupMutation = useMutation({
        mutationFn: (type) => createBackup(type),
        onMutate: () => {
            toast.info("Đang tiến hành sao lưu. Vui lòng đợi...");
        },
        onSuccess: (data) => {
            toast.success(data.message);
            queryClient.invalidateQueries(['backups']);
        },
        onError: (err) => {
            toast.error("Lỗi sao lưu: " + (err.response?.data?.message || err.message));
        }
    });

    // 3. Xóa Backup
    const deleteMutation = useMutation({
        mutationFn: deleteBackup,
        onSuccess: () => {
            toast.success("Đã xóa file backup.");
            queryClient.invalidateQueries(['backups']);
            setDeleteDialogOpen(false);
            setBackupToDelete(null);
        },
        onError: (err) => {
            toast.error("Lỗi xóa: " + (err.response?.data?.message || err.message));
            setDeleteDialogOpen(false);
        }
    });

    // 4. Phục hồi Backup
    const restoreMutation = useMutation({
        mutationFn: restoreBackup,
        onMutate: () => {
            toast.loading("Đang tiến hành phục hồi hệ thống...", { id: 'restore-process' });
        },
        onSuccess: (data) => {
            toast.dismiss('restore-process');
            toast.success(data.message || "Phục hồi dữ liệu thành công!");
            setRestoreDialogOpen(false);
            setBackupToRestore(null);
            
            // Reload trang sau 2s
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        },
        onError: (err) => {
            toast.dismiss('restore-process');
            toast.error("Lỗi phục hồi: " + (err.response?.data?.message || err.message));
            setRestoreDialogOpen(false);
        }
    });

    const handleDownload = async (path, name) => {
        try {
            toast.info("Đang chuẩn bị tải xuống...");
            const response = await downloadBackupLink(path);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', name);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error("Không thể tải file.");
        }
    };

    const confirmDelete = (backup) => {
        setBackupToDelete(backup);
        setDeleteDialogOpen(true);
    };

    const confirmRestore = (backup) => {
        setBackupToRestore(backup);
        setRestoreDialogOpen(true);
    };

    // Helper: Tính toán thống kê nhanh
    const latestBackup = backups && backups.length > 0 ? backups[0].created_at : "Chưa có";
    const totalBackups = backups ? backups.length : 0;

    return (
        // [LAYOUT FIX] Sử dụng h-full và overflow-hidden cho container chính
        <div className="h-full flex flex-col bg-muted/10 overflow-hidden">
            
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                            <ShieldCheck className="w-8 h-8 text-primary" /> 
                            BACKUP & RESTORE
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Quản lý các bản sao lưu Database và Dữ liệu hệ thống.
                        </p>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                size="lg"
                                className="bg-primary hover:bg-primary/90 shadow-md min-w-[180px] gap-2"
                                disabled={createBackupMutation.isPending || restoreMutation.isPending}
                            >
                                {createBackupMutation.isPending ? (
                                    <><Loader2 className="animate-spin h-4 w-4" /> Đang xử lý...</>
                                ) : (
                                    <><Database className="h-4 w-4" /> Tạo Bản Sao Lưu <ChevronDown className="h-4 w-4 opacity-50"/></>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Chọn loại sao lưu</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => createBackupMutation.mutate('db')} className="cursor-pointer gap-2">
                                <Database className="h-4 w-4 text-blue-500" />
                                <div className="flex flex-col">
                                    <span className="font-medium">Chỉ Database</span>
                                    <span className="text-[10px] text-muted-foreground">Nhanh, file nhỏ</span>
                                </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => createBackupMutation.mutate('full')} className="cursor-pointer gap-2">
                                <FileArchive className="h-4 w-4 text-orange-500" />
                                <div className="flex flex-col">
                                    <span className="font-medium">Toàn bộ (Full)</span>
                                    <span className="text-[10px] text-muted-foreground">Bao gồm cả file ảnh/tài liệu</span>
                                </div>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Stats Cards (Optional but nice) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-card shadow-sm border-l-4 border-l-blue-500">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600">
                                <Archive className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Tổng bản sao lưu</p>
                                <h3 className="text-2xl font-bold">{totalBackups}</h3>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card shadow-sm border-l-4 border-l-green-500">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600">
                                <Clock className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Bản mới nhất</p>
                                <h3 className="text-sm font-bold truncate max-w-[200px]" title={latestBackup}>{latestBackup}</h3>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card shadow-sm border-l-4 border-l-amber-500 md:col-span-1 hidden md:block">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    <strong>Lưu ý:</strong> Nên tải các bản sao lưu quan trọng về máy cá nhân để tránh mất dữ liệu khi server gặp sự cố phần cứng.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Table Card */}
                <Card className="shadow-sm border">
                    <CardHeader className="pb-2 border-b bg-muted/5">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <HardDrive className="w-5 h-5 text-muted-foreground" /> Danh sách bản sao lưu
                        </CardTitle>
                        <CardDescription>
                            File được lưu trữ tại <code>storage/app/{import.meta.env.VITE_APP_NAME || 'Laravel'}</code>
                        </CardDescription>
                    </CardHeader>
                    
                    <div className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[40%]">Tên Tập Tin</TableHead>
                                    <TableHead>Kích thước</TableHead>
                                    <TableHead>Thời gian tạo</TableHead>
                                    <TableHead className="hidden md:table-cell">Tuổi thọ</TableHead>
                                    <TableHead className="text-right">Hành động</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="animate-spin h-8 w-8 text-primary/50" />
                                                <p>Đang tải danh sách...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : backups?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <Database className="h-10 w-10 opacity-20" />
                                                <p>Chưa có bản sao lưu nào.</p>
                                                <Button variant="link" onClick={() => createBackupMutation.mutate('db')}>
                                                    Tạo ngay
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    backups.map((backup) => (
                                        <TableRow key={backup.path} className="hover:bg-muted/5 transition-colors group">
                                            <TableCell className="font-medium font-mono text-xs md:text-sm">
                                                <div className="flex items-center gap-2">
                                                    <FileArchive className="h-4 w-4 text-muted-foreground" />
                                                    <span className="truncate max-w-[200px] md:max-w-[300px]" title={backup.name}>
                                                        {backup.name}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono font-normal">
                                                    {backup.size}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {backup.created_at}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                                                {backup.age}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                        onClick={() => confirmRestore(backup)}
                                                        disabled={restoreMutation.isPending}
                                                        title="Phục hồi dữ liệu"
                                                    >
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>

                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                        onClick={() => handleDownload(backup.path, backup.name)}
                                                        title="Tải xuống"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                    
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => confirmDelete(backup)}
                                                        disabled={deleteMutation.isPending}
                                                        title="Xóa bản sao lưu"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
                
                {/* Footer Warning */}
                <div className="bg-amber-50/50 border border-amber-200/60 p-4 rounded-lg text-sm text-amber-900/80 flex gap-3">
                    <ShieldCheck className="w-5 h-5 text-amber-600/80 shrink-0 mt-0.5" />
                    <p>
                        Hệ thống tự động thực hiện sao lưu định kỳ vào 00:00 hàng ngày. 
                        Các bản sao lưu cũ hơn 30 ngày sẽ tự động bị xóa để tiết kiệm dung lượng.
                    </p>
                </div>
            </div>

            {/* --- Dialogs --- */}

            {/* Dialog Xác nhận Xóa */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xóa bản sao lưu?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này không thể hoàn tác. Bản sao lưu <strong>{backupToDelete?.name}</strong> sẽ bị xóa vĩnh viễn khỏi máy chủ.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => deleteMutation.mutate(backupToDelete?.path)}
                            disabled={deleteMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Xóa vĩnh viễn
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Dialog Xác nhận Restore */}
            <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
                <AlertDialogContent className="border-amber-200">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-amber-600 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" /> Cảnh báo Phục hồi Dữ liệu
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3 pt-2">
                            <p>Bạn đang chuẩn bị phục hồi hệ thống về trạng thái của bản sao lưu:</p>
                            <div className="bg-muted p-2 rounded text-center font-mono text-xs font-bold text-foreground break-all">
                                {backupToRestore?.name}
                            </div>
                            <div className="bg-red-50 text-red-600 p-3 rounded text-xs font-medium border border-red-100">
                                ⚠️ CẢNH BÁO: Toàn bộ dữ liệu hiện tại (Sinh viên, Điểm số, Đề tài...) sẽ bị thay thế. Những dữ liệu được tạo ra SAU thời điểm bản backup này sẽ bị MẤT VĨNH VIỄN.
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={restoreMutation.isPending}>Hủy bỏ</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => restoreMutation.mutate(backupToRestore?.path)}
                            disabled={restoreMutation.isPending}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {restoreMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                            Xác nhận Phục hồi
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}