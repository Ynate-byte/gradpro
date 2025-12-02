import React, { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as API from '@/api/fileManagerService';
import { 
    Folder, FileText, Image as ImageIcon, FileArchive, Home, Trash2, RefreshCw, 
    Search, ArrowLeft, UploadCloud, FolderPlus, Download, X, HardDrive, File, CheckSquare 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// --- HELPER ICONS ---
const FileIcon = ({ type, extension, className }) => {
    if (type === 'folder') return <Folder className={cn("fill-blue-500 text-blue-500", className)} />;
    switch (extension) {
        case 'pdf': return <FileText className={cn("text-red-500", className)} />;
        case 'zip': case 'rar': case '7z': return <FileArchive className={cn("text-yellow-600", className)} />;
        case 'jpg': case 'png': case 'jpeg': case 'webp': case 'gif': return <ImageIcon className={cn("text-purple-600", className)} />;
        case 'doc': case 'docx': return <FileText className={cn("text-blue-700", className)} />;
        case 'xls': case 'xlsx': return <FileText className={cn("text-green-600", className)} />;
        default: return <File className={cn("text-gray-400", className)} />;
    }
};

export default function FileManager() {
    const [currentPath, setCurrentPath] = useState('/');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isDeleting, setIsDeleting] = useState(false); 
    
    const fileInputRef = useRef(null);
    const queryClient = useQueryClient();

    // 1. GET DATA
    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['files', currentPath],
        queryFn: () => API.getFiles(currentPath),
        staleTime: 0, 
    });

    // 2. MUTATIONS
    const uploadMutation = useMutation({
        mutationFn: (files) => API.uploadFiles(currentPath, files),
        onSuccess: () => {
            toast.success("Upload thành công!");
            refetch();
            fileInputRef.current.value = null; 
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

    // 4. FILTERING & STATS
    const filteredData = useMemo(() => {
        return data?.data?.filter(item => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return item.name.toLowerCase().includes(term) || 
                   (item.metadata && item.metadata.toLowerCase().includes(term)) ||
                   item.real_name.toLowerCase().includes(term);
        }) || [];
    }, [data, searchTerm]);

    const stats = useMemo(() => {
        const folders = filteredData.filter(i => i.type === 'folder').length;
        const files = filteredData.length - folders;
        return { folders, files };
    }, [filteredData]);

    return (
        <div className="h-full flex flex-col bg-muted/10 overflow-hidden animate-in fade-in duration-500">
            
            {/* --- HEADER --- */}
            <div className="px-6 pt-6 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Folder className="w-3 h-3" /> {stats.folders} thư mục</span>
                        <Separator orientation="vertical" className="h-3" />
                        <span className="flex items-center gap-1"><File className="w-3 h-3" /> {stats.files} tập tin</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" className="bg-background shadow-sm" onClick={() => setIsCreateFolderOpen(true)}>
                        <FolderPlus className="h-4 w-4 mr-2" /> Thư mục mới
                    </Button>
                    <Button className="shadow-md" onClick={() => fileInputRef.current.click()} disabled={uploadMutation.isPending}>
                        {uploadMutation.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin"/> : <UploadCloud className="h-4 w-4 mr-2" />}
                        Tải lên
                    </Button>
                    <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleUpload} />
                </div>
            </div>

            {/* --- MAIN TOOLBAR --- */}
            <div className="px-6 py-4">
                <Card className="p-2 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm border-muted-foreground/20">
                    
                    {/* Navigation */}
                    <div className="flex items-center gap-2 overflow-hidden px-2 flex-1">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="shrink-0 h-8 w-8"
                            onClick={() => {
                                 const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
                                 handleNavigate(parentPath);
                            }} 
                            disabled={currentPath === '/'}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>

                        <Separator orientation="vertical" className="h-6" />

                        <div className="flex-1 overflow-x-auto whitespace-nowrap scrollbar-hide">
                            <Breadcrumb>
                                <BreadcrumbList className="flex-nowrap">
                                    {data?.breadcrumbs?.map((crumb, index) => (
                                        <React.Fragment key={crumb.path}>
                                            <BreadcrumbItem>
                                                <BreadcrumbLink 
                                                    onClick={() => handleNavigate(crumb.path)}
                                                    className={cn(
                                                        "cursor-pointer flex items-center gap-1 transition-colors px-1.5 py-1 rounded-md hover:bg-muted",
                                                        index === data.breadcrumbs.length - 1 ? 'font-semibold text-foreground pointer-events-none' : 'text-muted-foreground'
                                                    )}
                                                >
                                                    {crumb.path === '/' ? <Home className="h-3.5 w-3.5"/> : crumb.name}
                                                </BreadcrumbLink>
                                            </BreadcrumbItem>
                                            {index < data.breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                                        </React.Fragment>
                                    ))}
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>
                    </div>

                    {/* Search & Refresh */}
                    <div className="flex items-center gap-2 px-2 border-l pl-4 md:w-auto w-full">
                        <div className="relative w-full md:w-60">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input 
                                placeholder="Tìm kiếm tập tin..." 
                                className="pl-8 h-9 text-sm bg-muted/30 border-muted-foreground/20 focus-visible:bg-background transition-all" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => refetch()} title="Làm mới">
                            <RefreshCw className={cn("h-4 w-4", (isLoading || isRefetching) && "animate-spin")} />
                        </Button>
                    </div>
                </Card>
            </div>

            {/* --- SELECTION BAR (Conditional) --- */}
            {selectedItems.size > 0 && (
                <div className="px-6 pb-4 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="bg-primary/10 border border-primary/20 text-primary rounded-lg p-2 px-4 flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" /> Đã chọn {selectedItems.size} mục
                        </span>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 border-primary/30 hover:bg-primary/20 text-primary"
                                onClick={() => downloadMutation.mutate(Array.from(selectedItems))}
                                disabled={downloadMutation.isPending}
                            >
                                <Download className="h-3.5 w-3.5 mr-2" /> Tải về
                            </Button>
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                className="h-8 shadow-sm"
                                onClick={() => setIsDeleting(true)}
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Xóa
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/20 text-primary" onClick={() => setSelectedItems(new Set())}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CONTENT AREA --- */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
                {isLoading ? (
                    <div className="flex h-60 items-center justify-center text-muted-foreground flex-col gap-3">
                        <RefreshCw className="h-8 w-8 animate-spin text-primary/50" />
                        <p className="text-sm">Đang tải dữ liệu...</p>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-muted-foreground/10 rounded-xl bg-muted/5">
                        <div className="bg-muted/30 p-4 rounded-full mb-3">
                            <Folder className="h-10 w-10 stroke-1 opacity-50" />
                        </div>
                        <p className="font-medium">Thư mục trống</p>
                        <p className="text-xs mt-1">Chưa có tập tin nào được tải lên</p>
                        <Button variant="link" className="mt-2" onClick={() => fileInputRef.current.click()}>Tải lên ngay</Button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground px-1">
                            <div className="flex items-center gap-2">
                                <Checkbox 
                                    checked={filteredData.length > 0 && selectedItems.size === filteredData.length}
                                    onCheckedChange={selectAll}
                                    id="select-all"
                                />
                                <label htmlFor="select-all" className="cursor-pointer">Chọn tất cả</label>
                            </div>
                            <span>{filteredData.length} mục</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {filteredData.map((item) => {
                                const isSelected = selectedItems.has(item.path);
                                return (
                                    <div 
                                        key={item.path} 
                                        className={cn(
                                            "group relative flex flex-col p-3 rounded-xl border transition-all cursor-pointer select-none",
                                            isSelected 
                                                ? "bg-primary/5 border-primary ring-1 ring-primary shadow-sm" 
                                                : "bg-card hover:border-primary/50 hover:shadow-md border-transparent hover:bg-accent/5"
                                        )}
                                        onClick={(e) => {
                                            if (e.ctrlKey || e.metaKey || selectedItems.size > 0) {
                                                toggleSelection(item.path);
                                            } else {
                                                if(item.type === 'folder') handleNavigate(item.path);
                                                else window.open(item.url, '_blank');
                                            }
                                        }}
                                    >
                                        {/* Checkbox Overlay */}
                                        <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox 
                                                checked={isSelected}
                                                onCheckedChange={() => toggleSelection(item.path)}
                                                className={cn(
                                                    "data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-opacity bg-background/80 backdrop-blur-sm", 
                                                    !isSelected && "opacity-0 group-hover:opacity-100"
                                                )}
                                            />
                                        </div>

                                        <div className="aspect-square w-full mb-3 bg-muted/10 rounded-lg flex items-center justify-center overflow-hidden">
                                            {/* Preview ảnh nếu là ảnh */}
                                            {['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(item.extension) ? (
                                                <img 
                                                    src={item.url} 
                                                    alt={item.name} 
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <FileIcon type={item.type} extension={item.extension} className="h-12 w-12 opacity-80 group-hover:opacity-100 transition-opacity" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium leading-tight truncate" title={item.name}>
                                                {item.name}
                                            </p>
                                            <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                                                <span>{item.type === 'folder' ? `${item.items_count || 0} mục` : item.size}</span>
                                                {item.last_modified && <span>{new Date(item.last_modified).toLocaleDateString('vi-VN')}</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* --- DIALOGS --- */}
            <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tạo thư mục mới</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input 
                            placeholder="Nhập tên thư mục..." 
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && createFolderMutation.mutate()}
                            autoFocus
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                            Tên thư mục không được chứa các ký tự đặc biệt.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>Hủy</Button>
                        <Button onClick={() => createFolderMutation.mutate()} disabled={!newFolderName.trim()}>Tạo</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive flex items-center gap-2">
                            <Trash2 className="h-5 w-5" /> Xác nhận xóa
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p>Bạn có chắc chắn muốn xóa <strong>{selectedItems.size}</strong> mục đã chọn?</p>
                        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mt-3 text-sm text-destructive">
                            Hành động này không thể hoàn tác. Dữ liệu sẽ bị xóa vĩnh viễn.
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleting(false)}>Hủy</Button>
                        <Button 
                            variant="destructive" 
                            onClick={() => bulkDeleteMutation.mutate(Array.from(selectedItems))} 
                            disabled={bulkDeleteMutation.isPending}
                        >
                            {bulkDeleteMutation.isPending ? "Đang xóa..." : "Xóa vĩnh viễn"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}