import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Download, Trash2, Database, HardDrive, Loader2, ShieldCheck, AlertTriangle, ChevronDown, FileArchive } from 'lucide-react';
import { getBackups, createBackup, deleteBackup, downloadBackupLink } from '@/api/adminBackupService';
import { toast } from 'sonner';

export default function BackupPage() {
    const queryClient = useQueryClient();

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
        },
        onError: (err) => {
            toast.error("Lỗi xóa: " + (err.response?.data?.message || err.message));
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

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-primary">
                        <ShieldCheck className="w-8 h-8" /> 
                        Sao lưu & Phục hồi Dữ liệu
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Quản lý các bản sao lưu Database và Dữ liệu (Ảnh/Tài liệu).
                    </p>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            size="lg"
                            className="bg-blue-600 hover:bg-blue-700 shadow-lg min-w-[200px]"
                            disabled={createBackupMutation.isPending}
                        >
                            {createBackupMutation.isPending ? (
                                <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Đang xử lý...</>
                            ) : (
                                <><Database className="mr-2 h-4 w-4" /> Tạo Bản Sao Lưu <ChevronDown className="ml-2 h-4 w-4"/></>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => createBackupMutation.mutate('db')} className="cursor-pointer">
                            <Database className="mr-2 h-4 w-4 text-blue-500" />
                            <span>Chỉ Database (Rất nhanh)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => createBackupMutation.mutate('full')} className="cursor-pointer">
                            <FileArchive className="mr-2 h-4 w-4 text-orange-500" />
                            <span>Toàn bộ (DB + File)</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <HardDrive className="w-5 h-5 text-blue-500" /> Danh sách bản sao lưu
                        </CardTitle>
                        <CardDescription>
                            File backup được lưu tại <code>storage/app/{import.meta.env.VITE_APP_NAME || 'Laravel'}</code>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[40%]">Tên Tập Tin</TableHead>
                                        <TableHead>Kích thước</TableHead>
                                        <TableHead>Thời gian tạo</TableHead>
                                        <TableHead>Tuổi thọ</TableHead>
                                        <TableHead className="text-right">Hành động</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                <Loader2 className="animate-spin mx-auto mb-2 h-6 w-6" /> Đang tải dữ liệu...
                                            </TableCell>
                                        </TableRow>
                                    ) : backups?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Database className="h-8 w-8 opacity-20" />
                                                    <p>Chưa có bản sao lưu nào.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        backups.map((backup) => (
                                            <TableRow key={backup.path} className="hover:bg-muted/5 transition-colors">
                                                <TableCell className="font-medium font-mono text-xs md:text-sm truncate max-w-[300px]" title={backup.name}>
                                                    {backup.name}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="font-mono font-normal">
                                                        {backup.size}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {backup.created_at}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {backup.age}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                                            onClick={() => handleDownload(backup.path, backup.name)}
                                                            title="Tải xuống máy"
                                                        >
                                                            <Download className="h-4 w-4 mr-1" /> Tải về
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm"
                                                            className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                            onClick={() => {
                                                                if(confirm(`Xóa vĩnh viễn bản backup này?\n\n${backup.name}`)) {
                                                                    deleteMutation.mutate(backup.path);
                                                                }
                                                            }}
                                                            disabled={deleteMutation.isPending}
                                                            title="Xóa vĩnh viễn"
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
                    </CardContent>
                </Card>
                
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-sm text-amber-900 flex gap-3 items-start">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <strong className="block mb-1 text-amber-700">Lưu ý về Phục hồi (Restore):</strong>
                        <ul className="list-disc pl-4 space-y-1 opacity-90">
                            <li><strong>Chỉ Database:</strong> File nén chỉ chứa file SQL. Giải nén và import vào CSDL.</li>
                            <li><strong>Toàn bộ:</strong> File nén chứa file SQL và thư mục <code>public/storage</code>.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}