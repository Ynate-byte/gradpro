import React, { useState, useEffect, useId } from "react";
import axios from "../../../api/axiosConfig";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Loader2, FileText, CalendarDays, UserCircle } from "lucide-react";
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

// Import AlertDialog components
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    // (Xóa AlertDialogTrigger khỏi import nếu không dùng ở đâu khác)
} from "@/components/ui/alert-dialog";


// Lấy chữ cái đầu của tên
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

// Component Nút hành động (Sửa/Xóa)
const NewsItemActions = ({ onEdit, onConfirmDelete }) => ( // Bỏ `item` prop vì không dùng
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button
                variant="ghost"
                className="h-8 w-8 p-0 absolute top-2 right-2 z-10"
                onClick={(e) => e.stopPropagation()} // Ngăn không cho click vào card
            >
                <span className="sr-only">Mở menu</span>
                <MoreHorizontal className="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Sửa</span>
            </DropdownMenuItem>
            
            {/* ----- SỬA LỖI Ở ĐÂY ----- */}
            {/* Bỏ component <AlertDialogTrigger> đi */}
            <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onConfirmDelete(); }} // Chỉ cần gọi onClick
                onSelect={(e) => e.preventDefault()} // Vẫn giữ dòng này
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Xóa</span>
            </DropdownMenuItem>
            {/* ----- KẾT THÚC SỬA LỖI ----- */}

        </DropdownMenuContent>
    </DropdownMenu>
);

// Component Card Tin Tức
const NewsItemCard = ({
    item,
    layout = "grid",
    isRead,
    isNew,
    showActions,
    onEdit,
    onDelete, // Hàm onDelete sẽ trigger AlertDialog
    onOpen
}) => {
    const isFeatured = layout === 'featured';

    const formattedDate = item.created_at
        ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: vi })
        : 'N/A';
    const fullDate = item.created_at
        ? format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })
        : 'N/A';
    const authorName = item.nguoi_tao?.ten || "Không rõ";

    return (
        <Card
            className={cn(
                "transition-all shadow-md hover:shadow-xl cursor-pointer overflow-hidden flex",
                isRead ? 'bg-card' : 'bg-primary/5',
                isFeatured ? 'flex-col md:flex-row' : 'flex-col' // Bố cục cho featured và grid
            )}
            onClick={onOpen}
        >
            {/* --- Phần Hình ảnh --- */}
            {item.cover_image_url && (
                <div
                    className={cn(
                        "flex-shrink-0 bg-muted relative",
                        isFeatured ? 'md:w-2/5 aspect-video md:aspect-auto' : 'w-full aspect-video'
                    )}
                >
                    <img
                        src={item.cover_image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                    />
                     {isNew && !isRead && (
                        <Badge variant="destructive" className="absolute top-2 left-2 text-xs animate-pulse z-10">MỚI</Badge>
                    )}
                </div>
            )}
           
            {/* --- Phần Nội dung --- */}
            <div className={cn("flex-grow flex flex-col justify-between", isFeatured ? 'md:w-3/5' : 'w-full')}>
                <CardHeader className="relative pb-2">
                    {showActions && (
                        <NewsItemActions
                            onEdit={onEdit}
                            onConfirmDelete={onDelete} // Truyền hàm xóa xuống
                        />
                    )}
                    {item.category && (
                        <CardDescription className="text-primary font-semibold text-xs uppercase tracking-wider">
                            {item.category}
                        </CardDescription>
                    )}
                    <CardTitle
                        className={cn(
                            "text-lg sm:text-xl font-bold leading-tight",
                            isRead ? 'text-muted-foreground' : 'text-foreground'
                        )}
                    >
                        {item.title}
                    </CardTitle>
                </CardHeader>
                
                <CardContent className="py-2">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {/* {item.snippet || "Nhấn để xem chi tiết nội dung bài viết..."} */}
                    </p>
                </CardContent>

                <CardFooter className="flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-2 mt-auto">
                    <div className="flex items-center gap-1.5" title="Tác giả">
                        <UserCircle className="h-3.5 w-3.5" />
                        <span>{authorName}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title={fullDate}>
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>{formattedDate}</span>
                    </div>
                    {item.pdf_url && (
                        <div className="flex items-center gap-1.5 text-red-600 font-medium">
                            <FileText className="h-3.5 w-3.5" />
                            <span>Có PDF</span>
                        </div>
                    )}
                </CardFooter>
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
    const navigate = useNavigate();

    // State cho AlertDialog
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [newsToDelete, setNewsToDelete] = useState(null); // Lưu thông tin tin tức sẽ bị xóa
    const deleteTitleId = useId(); // ID cho accessiblity
    const deleteDescriptionId = useId(); // ID cho accessiblity

    // Lấy danh sách tin đã đọc từ localStorage
    useEffect(() => {
        const stored = localStorage.getItem("readNewsIds");
        if (stored) setReadNewsIds(new Set(JSON.parse(stored)));
    }, []);

    // Fetch news data
    const fetchNews = async () => {
        try {
            setLoading(true);
            const res = await axios.get("/news");
            const data = Array.isArray(res.data.data) ? res.data.data : [];
            const sortedData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setNews(sortedData);

            // Extract unique categories including a fallback for uncategorized items
            const uniqueCategories = [
                "Tất cả",
                ...new Set(sortedData.map(item => item.category || "Chưa phân loại").filter(Boolean))
            ];
            setCategories(uniqueCategories);

        } catch (err) {
            setError(err.response?.data?.error || "Không thể tải danh sách tin tức.");
            toast.error(err.response?.data?.error || "Không thể tải danh sách tin tức.");
        } finally {
            setLoading(false);
        }
    };

    // Gọi API để tải tin tức when refresh changes
    useEffect(() => {
        fetchNews();
    }, [refresh]);


    const handleOpenNews = (item) => {
        // Mark as read and navigate
        if (!readNewsIds.has(item.id)) {
            const updated = new Set(readNewsIds).add(item.id);
            setReadNewsIds(updated);
            localStorage.setItem("readNewsIds", JSON.stringify(Array.from(updated)));
        }
        navigate(`/news/${item.id}`);
    };

    // Hàm mở AlertDialog xác nhận xóa
    const confirmDelete = (item) => {
        setNewsToDelete(item);
        setIsDeleteDialogOpen(true);
    };

    // Hàm thực hiện xóa sau khi xác nhận từ AlertDialog
    const executeDelete = async () => {
        if (!newsToDelete) return;

        try {
            await axios.delete(`/news/${newsToDelete.id}`);
            toast.success(`Đã xóa tin tức "${newsToDelete.title}".`);
            fetchNews(); // Refresh the list
            setNewsToDelete(null); // Clear item
            setIsDeleteDialogOpen(false); // Close dialog
        } catch(err) {
            toast.error("Xóa thất bại: " + (err.response?.data?.error || err.message));
        }
    };

    // Filter news based on selected category
    const filteredNews =
        selectedCategory === "Tất cả"
            ? news
            : news.filter((item) => (item.category || "Chưa phân loại") === selectedCategory);

    // Check if an item is considered new (e.g., created within the last 3 days)
    const isNew = (dateStr) => {
        if (!dateStr) return false;
        try {
            const created = new Date(dateStr);
            const now = new Date();
            const diffDays = (now - created) / (1000 * 60 * 60 * 24);
            return diffDays <= 3;
        } catch {
            return false;
        }
    };

    if (loading)
        return (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );

    if (error)
        return (
            <div className="text-center py-8 text-red-600 bg-red-50 rounded-lg border border-red-200">
                {error}
            </div>
        );

    const featuredNews = filteredNews[0];
    const olderNews = filteredNews.slice(1);

    return (
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="mb-4 overflow-x-auto justify-start h-auto p-1 bg-muted rounded-lg">
                {categories.map((cat) => (
                    <TabsTrigger key={cat} value={cat} className="whitespace-nowrap text-xs sm:text-sm px-3 py-1.5">
                        {cat}
                    </TabsTrigger>
                ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-6">
                {filteredNews.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        Không có tin tức nào trong danh mục này.
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* 1. Bài viết nổi bật (Featured) */}
                        {featuredNews && (
                            <NewsItemCard
                                item={featuredNews}
                                layout="featured"
                                isRead={readNewsIds.has(featuredNews.id)}
                                isNew={isNew(featuredNews.created_at)}
                                showActions={showActions}
                                onEdit={() => onEdit(featuredNews)}
                                onDelete={() => confirmDelete(featuredNews)} // Gọi hàm confirmDelete
                                onOpen={() => handleOpenNews(featuredNews)}
                            />
                        )}

                        {/* 2. Lưới các bài viết cũ hơn */}
                        {olderNews.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-2xl font-bold">Tin cũ hơn</h2>
                                    <Separator className="flex-1" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {olderNews.map((item) => (
                                        <NewsItemCard
                                            key={item.id}
                                            item={item}
                                            layout="grid"
                                            isRead={readNewsIds.has(item.id)}
                                            isNew={isNew(item.created_at)}
                                            showActions={showActions}
                                            onEdit={() => onEdit(item)}
                                            onDelete={() => confirmDelete(item)} // Gọi hàm confirmDelete
                                            onOpen={() => handleOpenNews(item)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </TabsContent>

            {/* AlertDialog để xác nhận xóa */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent aria-labelledby={deleteTitleId} aria-describedby={deleteDescriptionId}>
                    <AlertDialogHeader>
                        <AlertDialogTitle id={deleteTitleId}>Xác nhận xóa</AlertDialogTitle>
                        <AlertDialogDescription id={deleteDescriptionId}>
                            Bạn có chắc chắn muốn xóa tin tức "{newsToDelete?.title}" không? Hành động này không thể hoàn tác.
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