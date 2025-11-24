import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as API from '@/api/fileManagerService';
import { 
    Folder, FileText, Image as ImageIcon, FileArchive, Home, Trash2, RefreshCw, 
    Search, ArrowLeft, UploadCloud, FolderPlus, Download, X 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const FileIcon = ({ type, extension, className }) => {
    if (type === 'folder') return <Folder className={cn("fill-blue-500 text-blue-500", className)} />;
    switch (extension) {
        case 'pdf': return <FileText className={cn("text-red-500", className)} />;
        case 'zip': case 'rar': case '7z': return <FileArchive className={cn("text-yellow-500", className)} />;
        case 'jpg': case 'png': case 'jpeg': case 'webp': return <ImageIcon className={cn("text-purple-500", className)} />;
        default: return <FileText className={cn("text-gray-500", className)} />;
    }
};

export default function FileManager() {
    const [currentPath, setCurrentPath] = useState('/');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false); // Dialog xác nhận xóa
    
    const fileInputRef = useRef(null);
    const queryClient = useQueryClient();

    // 1. GET DATA
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['files', currentPath],
        queryFn: () => API.getFiles(currentPath),
        staleTime: 0, // Luôn fetch mới
    });

    // 2. MUTATIONS
    const uploadMutation = useMutation({
        mutationFn: (files) => API.uploadFiles(currentPath, files),
        onSuccess: () => {
            toast.success("Upload thành công!");
            refetch();
            fileInputRef.current.value = null; // Reset input
        },
        onError: (err) => toast.error("Lỗi upload: " + err.message)
    });

    const createFolderMutation = useMutation({
        mutationFn: () => API.createFolder(currentPath, newFolderName),
        onSuccess: () => {
            toast.success("Tạo thư mục thành công");
            setIsCreateFolderOpen(false);
            setNewFolderName('');
            refetch();
        },
        onError: (err) => toast.error(err.response?.data?.message || "Lỗi tạo folder")
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: API.bulkDelete,
        onSuccess: (res) => {
            toast.success(res.message);
            setSelectedItems(new Set());
            setIsDeleting(false);
            refetch();
        },
        onError: (err) => toast.error("Lỗi xóa: " + err.message)
    });

    const downloadMutation = useMutation({
        mutationFn: API.bulkDownloadItems,
        onSuccess: () => toast.success("Đang bắt đầu tải xuống..."),
        onError: () => toast.error("Lỗi tải xuống")
    });

    // 3. HANDLERS
    const handleNavigate = (path) => {
        setSearchTerm('');
        setSelectedItems(new Set());
        setCurrentPath(path);
    };

    const toggleSelection = (path) => {
        const newSet = new Set(selectedItems);
        if (newSet.has(path)) newSet.delete(path);
        else newSet.add(path);
        setSelectedItems(newSet);
    };

    const selectAll = () => {
        if (selectedItems.size === filteredData.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(filteredData.map(i => i.path)));
        }
    };

    const handleUpload = (e) => {
        if (e.target.files.length > 0) {
            uploadMutation.mutate(e.target.files);
        }
    };

    // 4. FILTERING
    const filteredData = data?.data?.filter(item => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return item.name.toLowerCase().includes(term) || 
               (item.metadata && item.metadata.toLowerCase().includes(term)) ||
               item.real_name.toLowerCase().includes(term);
    }) || [];

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col bg-card rounded-lg border shadow-sm">
            
            {/* --- TOOLBAR --- */}
            <div className="p-3 border-b flex flex-col md:flex-row md:items-center justify-between bg-muted/20 gap-3">
                
                {/* Left: Navigation */}
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <Button variant="ghost" size="icon" onClick={() => {
                         const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
                         handleNavigate(parentPath);
                    }} disabled={currentPath === '/'}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>

                    <Breadcrumb className="hidden md:block">
                        <BreadcrumbList>
                            {data?.breadcrumbs?.map((crumb, index) => (
                                <React.Fragment key={crumb.path}>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink 
                                            onClick={() => handleNavigate(crumb.path)}
                                            className={`cursor-pointer flex items-center gap-1 hover:text-primary ${index === data.breadcrumbs.length - 1 ? 'font-bold text-foreground pointer-events-none' : ''}`}
                                        >
                                            {crumb.path === '/' ? <Home className="h-4 w-4"/> : crumb.name}
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    {index < data.breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                                </React.Fragment>
                            ))}
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    <div className="relative w-40 md:w-52">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Tìm kiếm..." 
                            className="pl-8 h-9" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Selection Mode Actions */}
                    {selectedItems.size > 0 ? (
                        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-5 bg-accent/50 p-1 rounded-md">
                            <Button variant="destructive" size="sm" onClick={() => setIsDeleting(true)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Xóa ({selectedItems.size})
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => downloadMutation.mutate(Array.from(selectedItems))}>
                                <Download className="h-4 w-4 mr-2" /> Tải về
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedItems(new Set())}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        /* Default Actions */
                        <>
                            <Button variant="outline" size="sm" onClick={() => setIsCreateFolderOpen(true)}>
                                <FolderPlus className="h-4 w-4 mr-2" /> Thư mục
                            </Button>
                            <Button variant="default" size="sm" onClick={() => fileInputRef.current.click()}>
                                <UploadCloud className="h-4 w-4 mr-2" /> Upload
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => refetch()}>
                                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </Button>
                            <input 
                                type="file" 
                                multiple 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleUpload} 
                            />
                        </>
                    )}
                </div>
            </div>

            {/* --- SELECT ALL BAR --- */}
            <div className="px-4 py-2 border-b bg-muted/10 flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox 
                    checked={filteredData.length > 0 && selectedItems.size === filteredData.length}
                    onCheckedChange={selectAll}
                />
                <span>Chọn tất cả ({filteredData.length} mục)</span>
                <div className="ml-auto font-medium">
                    {uploadMutation.isPending && <span className="text-blue-600 flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin"/> Đang tải lên...</span>}
                    {downloadMutation.isPending && <span className="text-green-600 flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin"/> Đang nén & tải...</span>}
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <ScrollArea className="flex-1 p-4 bg-muted/5">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">Đang tải...</div>
                ) : filteredData.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground opacity-50">
                        <Folder className="h-16 w-16 mb-2 stroke-1" />
                        <p>Thư mục trống</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-10">
                        {filteredData.map((item) => {
                            const isSelected = selectedItems.has(item.path);
                            return (
                                <div 
                                    key={item.path} 
                                    className={cn(
                                        "group relative flex flex-col p-3 rounded-xl border transition-all cursor-pointer select-none",
                                        isSelected ? "bg-blue-50 border-blue-400 ring-1 ring-blue-400 shadow-sm" : "bg-background hover:border-primary/50 hover:shadow-md"
                                    )}
                                    onClick={(e) => {
                                        if (e.ctrlKey || e.metaKey) {
                                            toggleSelection(item.path);
                                        } else {
                                            // Nếu đang ở chế độ chọn (đã có item chọn), click thường cũng là chọn
                                            if(selectedItems.size > 0) {
                                                toggleSelection(item.path);
                                            } else {
                                                if(item.type === 'folder') handleNavigate(item.path);
                                                else window.open(item.url, '_blank');
                                            }
                                        }
                                    }}
                                >
                                    {/* Checkbox Overlay */}
                                    <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox 
                                            checked={isSelected}
                                            onCheckedChange={() => toggleSelection(item.path)}
                                            className={cn("data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 transition-opacity", 
                                                !isSelected && "opacity-0 group-hover:opacity-100"
                                            )}
                                        />
                                    </div>

                                    <div className="flex items-start gap-3 mb-2">
                                        <div className="h-10 w-10 shrink-0 flex items-center justify-center bg-muted/20 rounded-lg">
                                            <FileIcon type={item.type} extension={item.extension} className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <p className="text-sm font-medium leading-tight truncate break-words" title={item.name}>
                                                {item.name}
                                            </p>
                                            {item.metadata ? (
                                                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-tight" title={item.metadata}>
                                                    {item.metadata}
                                                </p>
                                            ) : item.real_name !== item.name ? (
                                                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">{item.real_name}</p>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="mt-auto flex items-center justify-between pt-2 border-t text-[10px] text-muted-foreground">
                                        <span>{item.type === 'folder' ? `${item.items_count} mục` : item.size}</span>
                                        <span>{new Date(item.last_modified).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>

            {/* --- DIALOG TẠO THƯ MỤC --- */}
            <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tạo thư mục mới</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input 
                            placeholder="Tên thư mục (VD: TaiLieu_ThamKhao)" 
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && createFolderMutation.mutate()}
                        />
                        <p className="text-xs text-muted-foreground mt-2">Chỉ dùng chữ cái, số, gạch dưới (_) và gạch ngang (-).</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>Hủy</Button>
                        <Button onClick={() => createFolderMutation.mutate()} disabled={!newFolderName.trim()}>Tạo</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- DIALOG XÓA --- */}
            <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa?</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p>Bạn đang xóa <strong>{selectedItems.size}</strong> mục.</p>
                        <p className="text-sm text-muted-foreground mt-1">Hành động này không thể hoàn tác. Các file đã xóa sẽ mất vĩnh viễn.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleting(false)}>Hủy</Button>
                        <Button variant="destructive" onClick={() => bulkDeleteMutation.mutate(Array.from(selectedItems))} disabled={bulkDeleteMutation.isPending}>
                            {bulkDeleteMutation.isPending ? "Đang xóa..." : "Xác nhận xóa"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}