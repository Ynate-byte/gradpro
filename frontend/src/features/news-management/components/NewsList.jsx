import React, { useState, useEffect, useId } from "react";
import axios from "../../../api/axiosConfig";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
    MoreHorizontal, Edit, Trash2, Loader2, FileText, 
    CalendarDays, UserCircle, Pin, ChevronDown 
} from "lucide-react";
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
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

// Lấy chữ cái đầu của tên
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

// Component Nút hành động
const NewsItemActions = ({ onEdit, onConfirmDelete }) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button
                variant="ghost"
                className="h-6 w-6 p-0 absolute top-1 right-1 z-20 hover:bg-muted/80"
                onClick={(e) => e.stopPropagation()} 
            >
                <span className="sr-only">Mở menu</span>
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Sửa</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onConfirmDelete(); }}
                onSelect={(e) => e.preventDefault()}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Xóa</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
);

// Component Card Tin Tức (Compact Version)
const NewsItemCard = ({
    item,
    layout = "list",
    isRead,
    isNew,
    showActions,
    onEdit,
    onDelete,
    onOpen
}) => {
    const isFeatured = layout === 'featured';

    const formattedDate = item.created_at
        ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: vi })
        : 'N/A';
    const authorName = item.nguoi_tao?.ten || "Admin";

    // Tách nội dung text thuần để làm snippet (nếu cần)
    const snippet = item.content 
        ? item.content.replace(/<[^>]+>/g, '').substring(0, isFeatured ? 120 : 0) 
        : "";

    return (
        <Card
            className={cn(
                "transition-all cursor-pointer overflow-hidden group relative border",
                isRead ? 'bg-card' : 'bg-primary/5 border-primary/20',
                // --- Layout Config ---
                isFeatured 
                    ? "flex flex-col md:flex-row md:h-48 shadow-md hover:shadow-lg" // Featured: Ngang, cao 48 (192px)
                    : "flex flex-row h-24 hover:bg-muted/40 shadow-sm", // List: Ngang, cao 24 (96px) - Siêu gọn
                item.is_pinned && "border-orange-200 dark:border-orange-900"
            )}
            onClick={onOpen}
        >
            {/* --- Phần Hình ảnh --- */}
            <div
                className={cn(
                    "flex-shrink-0 bg-muted relative overflow-hidden",
                    isFeatured 
                        ? "w-full h-40 md:h-full md:w-1/3" // Featured: 1/3 chiều rộng
                        : "w-32 h-full" // List: Cố định 128px chiều rộng
                )}
            >
                {item.cover_image_url ? (
                    <img
                        src={item.cover_image_url}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-muted-foreground">
                        <FileText className={cn("opacity-20", isFeatured ? "h-12 w-12" : "h-8 w-8")} />
                    </div>
                )}
                
                {isNew && !isRead && (
                    <Badge variant="destructive" className="absolute top-1 left-1 text-[9px] px-1 py-0 z-10 h-4">MỚI</Badge>
                )}
            </div>
           
            {/* --- Phần Nội dung --- */}
            <div className={cn("flex flex-col flex-grow min-w-0 justify-between", isFeatured ? "p-4" : "p-2.5")}>
                <div>
                    {/* Header: Badge & Action */}
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            {item.is_pinned && (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 px-1 py-0 text-[9px] gap-0.5 h-4">
                                    <Pin className="h-2.5 w-2.5 fill-orange-700" /> Ghim
                                </Badge>
                            )}
                            {item.category && isFeatured && (
                                <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
                                    {item.category}
                                </span>
                            )}
                        </div>
                        
                        {showActions && (
                            <div className="absolute top-1 right-1">
                                <NewsItemActions onEdit={onEdit} onConfirmDelete={onDelete} />
                            </div>
                        )}
                    </div>

                    {/* Title - Giới hạn dòng chặt chẽ */}
                    <h3 
                        className={cn(
                            "font-bold text-foreground group-hover:text-primary transition-colors leading-tight",
                            isFeatured ? "text-lg line-clamp-2 mb-2" : "text-sm line-clamp-2 mb-0"
                        )}
                        title={item.title}
                    >
                        {item.title}
                    </h3>

                    {/* Description - Chỉ hiện cho Featured */}
                    {isFeatured && snippet && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {snippet}...
                        </p>
                    )}
                </div>

                {/* Footer: Meta info */}
                <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground mt-1">
                    <div className="flex items-center gap-1" title="Tác giả">
                        <UserCircle className="h-3 w-3" />
                        <span className="truncate max-w-[80px]">{authorName}</span>
                    </div>
                    <div className="flex items-center gap-1" title={formattedDate}>
                        <CalendarDays className="h-3 w-3" />
                        <span>{formattedDate}</span>
                    </div>
                    {item.pdf_url && (
                        <div className="flex items-center gap-0.5 text-red-600 font-bold ml-auto bg-red-50 px-1.5 py-0.5 rounded">
                            <FileText className="h-3 w-3" /> PDF
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};


// ----- COMPONENT CHÍNH: Danh sách Tin Tức -----
const NewsList = ({ onEdit, refresh, showActions = false }) => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [categories, setCategories] = useState(["Tất cả"]);
    const [selectedCategory, setSelectedCategory] = useState("Tất cả");
    const [readNewsIds, setReadNewsIds] = useState(new Set());
    
    // [STATE] Quản lý phân trang client-side
    const [visibleCount, setVisibleCount] = useState(10); // Mặc định hiện 10 tin
    
    const navigate = useNavigate();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [newsToDelete, setNewsToDelete] = useState(null);
    const deleteTitleId = useId();
    const deleteDescriptionId = useId();

    useEffect(() => {
        const stored = localStorage.getItem("readNewsIds");
        if (stored) setReadNewsIds(new Set(JSON.parse(stored)));
    }, []);

    // Reset lại số lượng hiển thị khi đổi category hoặc refresh
    useEffect(() => {
        setVisibleCount(10);
    }, [selectedCategory, refresh]);

    const fetchNews = async () => {
        try {
            setLoading(true);
            const res = await axios.get("/news");
            const data = Array.isArray(res.data.data) ? res.data.data : [];
            
            const sortedData = data.sort((a, b) => {
                const pinnedA = a.is_pinned ? 1 : 0;
                const pinnedB = b.is_pinned ? 1 : 0;
                if (pinnedA !== pinnedB) return pinnedB - pinnedA;
                return new Date(b.created_at) - new Date(a.created_at);
            });

            setNews(sortedData);

            const uniqueCategories = [
                "Tất cả",
                ...new Set(sortedData.map(item => item.category || "Chưa phân loại").filter(Boolean))
            ];
            setCategories(uniqueCategories);

        } catch (err) {
            setError(err.response?.data?.error || "Không thể tải danh sách tin tức.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, [refresh]);

    const handleOpenNews = (item) => {
        if (!readNewsIds.has(item.id)) {
            const updated = new Set(readNewsIds).add(item.id);
            setReadNewsIds(updated);
            localStorage.setItem("readNewsIds", JSON.stringify(Array.from(updated)));
        }
        navigate(`/news/${item.id}`);
    };

    const confirmDelete = (item) => {
        setNewsToDelete(item);
        setIsDeleteDialogOpen(true);
    };

    const executeDelete = async () => {
        if (!newsToDelete) return;
        try {
            await axios.delete(`/news/${newsToDelete.id}`);
            toast.success(`Đã xóa tin tức "${newsToDelete.title}".`);
            fetchNews(); 
            setNewsToDelete(null);
            setIsDeleteDialogOpen(false);
        } catch(err) {
            toast.error("Xóa thất bại.");
        }
    };

    const filteredNews = selectedCategory === "Tất cả"
        ? news
        : news.filter((item) => (item.category || "Chưa phân loại") === selectedCategory);

    const isNew = (dateStr) => {
        if (!dateStr) return false;
        try {
            const created = new Date(dateStr);
            const now = new Date();
            return (now - created) / (1000 * 60 * 60 * 24) <= 3;
        } catch { return false; }
    };

    // [LOGIC] Cắt danh sách hiển thị
    const displayedNews = filteredNews.slice(0, visibleCount);
    const hasMore = visibleCount < filteredNews.length;

    if (loading && news.length === 0) return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (error) return <div className="text-center py-8 text-red-600">{error}</div>;

    // Tách tin nổi bật (Tin đầu tiên) và tin thường
    const featuredNews = displayedNews[0];
    const listNews = displayedNews.slice(1);

    return (
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="mb-4 overflow-x-auto justify-start h-auto p-1 bg-muted rounded-lg w-full sm:w-auto scrollbar-hide">
                {categories.map((cat) => (
                    <TabsTrigger key={cat} value={cat} className="whitespace-nowrap text-xs px-3 py-1.5">
                        {cat}
                    </TabsTrigger>
                ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-0 space-y-6">
                {displayedNews.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm italic border rounded-lg bg-muted/20">
                        Không có tin tức nào.
                    </div>
                ) : (
                    <>
                        {/* 1. Tin nổi bật (Featured - Horizontal Compact) */}
                        {featuredNews && (
                            <div className="mb-4">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-2 px-1">Nổi bật nhất</h3>
                                <NewsItemCard
                                    item={featuredNews}
                                    layout="featured"
                                    isRead={readNewsIds.has(featuredNews.id)}
                                    isNew={isNew(featuredNews.created_at)}
                                    showActions={showActions}
                                    onEdit={() => onEdit(featuredNews)}
                                    onDelete={() => confirmDelete(featuredNews)}
                                    onOpen={() => handleOpenNews(featuredNews)}
                                />
                            </div>
                        )}

                        {/* 2. Danh sách tin thường (List - Super Compact) */}
                        {listNews.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase mb-2 px-1">Mới nhất</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {listNews.map((item) => (
                                        <NewsItemCard
                                            key={item.id}
                                            item={item}
                                            layout="list"
                                            isRead={readNewsIds.has(item.id)}
                                            isNew={isNew(item.created_at)}
                                            showActions={showActions}
                                            onEdit={() => onEdit(item)}
                                            onDelete={() => confirmDelete(item)}
                                            onOpen={() => handleOpenNews(item)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. Nút Xem thêm */}
                        {hasMore && (
                            <div className="flex justify-center pt-2">
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setVisibleCount(prev => prev + 10)}
                                    className="gap-2 text-xs"
                                >
                                    Xem thêm tin cũ <ChevronDown className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </TabsContent>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa tin tức này không?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDelete} className="bg-destructive hover:bg-destructive/90 text-white">
                            Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Tabs>
    );
};

export default NewsList;