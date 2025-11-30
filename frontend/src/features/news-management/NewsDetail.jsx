import React, { useState, useEffect } from "react";
import axios from "../../api/axiosConfig";
import { useParams, useNavigate } from "react-router-dom";
import { 
    Loader2, ArrowLeft, Share2, Edit3, Trash2, 
    Calendar, User, FileText, Download, Eye, Pin, Clock 
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// --- HELPER: Lấy chữ cái đầu ---
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

// --- COMPONENT: ITEM SIDEBAR ---
const SidebarNewsItem = ({ item, onClick }) => (
    <div 
        onClick={onClick}
        className="group flex gap-4 py-4 border-b border-dashed border-gray-200 dark:border-gray-800 last:border-0 cursor-pointer"
    >
        {/* Ảnh Thumbnail bên trái */}
        <div className="w-24 h-16 shrink-0 overflow-hidden rounded bg-muted relative">
            {item.cover_image_url ? (
                <img 
                    src={item.cover_image_url} 
                    alt="" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                    <FileText className="w-6 h-6" />
                </div>
            )}
             {/* Badge Ghim nhỏ trên ảnh */}
             {item.is_pinned && (
                <div className="absolute top-0 left-0 bg-red-600 text-white p-0.5 rounded-br shadow-sm">
                    <Pin className="w-3 h-3" />
                </div>
            )}
        </div>

        {/* Tiêu đề & Meta */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                {item.title}
            </h4>
            <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: vi })}
                </span>
            </div>
        </div>
    </div>
);

// --- MAIN COMPONENT: NEWS DETAIL ---
const NewsDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // --- Logic Phân Quyền ---
    const userRoleName = user?.vaitro?.TEN_VAITRO;
    const positionCodes = user?.giangvien?.chucvus?.map(cv => cv.MA_CHUCVU) || [];

    const canManageNews = 
        userRoleName === 'Admin' || 
        userRoleName === 'Trưởng khoa' || 
        positionCodes.includes('TRUONG_KHOA') ||
        userRoleName === 'Giáo vụ' || 
        positionCodes.includes('GIAO_VU');
    // ------------------------

    const [news, setNews] = useState(null);
    const [sidebarNews, setSidebarNews] = useState([]); // Tin mới & Ghim
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // State cho PDF
    const [pdfObjectUrl, setPdfObjectUrl] = useState(null);
    const [showPdf, setShowPdf] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);

    useEffect(() => {
        // Reset state khi đổi bài (id thay đổi)
        setNews(null);
        setPdfObjectUrl(null);
        setShowPdf(false);
        setError(null);
        setLoading(true);

        // Fetch dữ liệu mới
        fetchData();

        // Cleanup URL blob khi unmount hoặc đổi bài
        return () => {
            if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl);
        };
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // 1. Lấy tin chi tiết
            const detailRes = await axios.get(`/news/${id}`);
            setNews(detailRes.data);

            // 2. Lấy danh sách tin cho Sidebar (Tin mới + Ghim)
            // Lưu ý: Trong thực tế nên có API riêng lấy tin liên quan để tối ưu
            const listRes = await axios.get("/news");
            const allNews = Array.isArray(listRes.data.data) ? listRes.data.data : [];

            // Lọc bỏ bài hiện tại & Sắp xếp: Ghim trước -> Mới nhất
            const sortedSidebar = allNews
                .filter(item => item.id !== Number(id))
                .sort((a, b) => {
                    // Ưu tiên ghim
                    const pinnedA = a.is_pinned ? 1 : 0;
                    const pinnedB = b.is_pinned ? 1 : 0;
                    if (pinnedA !== pinnedB) return pinnedB - pinnedA;
                    
                    // Sau đó đến ngày tạo
                    return new Date(b.created_at) - new Date(a.created_at);
                })
                .slice(0, 6); // Lấy 6 tin

            setSidebarNews(sortedSidebar);

        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || "Lỗi tải dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    const togglePdfPreview = async () => {
        if (showPdf) { setShowPdf(false); return; }
        if (pdfObjectUrl) { setShowPdf(true); return; }

        setPdfLoading(true);
        try {
            const response = await axios.get(`/news/${id}/pdf`, { responseType: 'blob' });
            const file = new Blob([response.data], { type: 'application/pdf' });
            setPdfObjectUrl(URL.createObjectURL(file));
            setShowPdf(true);
        } catch (err) {
            toast.error("Không thể tải file PDF đính kèm.");
        } finally {
            setPdfLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Bạn có chắc muốn xóa tin này?")) return;
        try {
            await axios.delete(`/news/${id}`);
            toast.success("Đã xóa thành công!");
            navigate("/news");
        } catch (err) {
            toast.error("Xóa thất bại.");
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Đã sao chép liên kết!");
    };

    if (loading) return (
        <div className="flex justify-center items-center h-full min-h-[60vh]">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );

    if (!news) return (
        <div className="p-12 text-center h-full flex flex-col justify-center items-center">
            <h2 className="text-xl font-bold text-gray-700">Bài viết không tồn tại hoặc đã bị xóa.</h2>
            <Button variant="link" onClick={() => navigate("/news")}>Quay lại trang tin tức</Button>
        </div>
    );

    const authorName = news.nguoi_tao?.ten || "Ban Quản trị";
    const createdDate = new Date(news.created_at);

    return (
        // [FIX SCROLL] Thêm h-full và overflow-y-auto để cho phép cuộn nội dung trong Layout cha
        <div className="h-full overflow-y-auto bg-white dark:bg-gray-950">
            
            {/* --- THANH ĐIỀU HƯỚNG TOP (Sticky) --- */}
            <div className="border-b sticky top-0 bg-white/90 dark:bg-gray-950/90 backdrop-blur z-40">
                <div className="container max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/news")} className="-ml-2 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Tin tức
                    </Button>
                    
                    <div className="flex items-center gap-1">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={handleShare}>
                                        <Share2 className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Chia sẻ</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        
                        {canManageNews && (
                            <>
                                <Separator orientation="vertical" className="h-5 mx-1" />
                                {/* Chuyền state editNewsId để NewsPage biết cần mở form edit */}
                                <Button variant="ghost" size="sm" onClick={() => navigate("/news", { state: { editNewsId: news.id } })}>
                                    <Edit3 className="w-4 h-4 mr-2 text-blue-600" /> Sửa
                                </Button>
                                <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-600 hover:bg-red-50">
                                    <Trash2 className="w-4 h-4 mr-2" /> Xóa
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* --- NỘI DUNG CHÍNH --- */}
            <div className="container max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-12 pb-20">
                
                {/* CỘT TRÁI: BÀI VIẾT (8 phần) */}
                <motion.div 
                    className="lg:col-span-8"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Metadata header */}
                    <div className="mb-6">
                        <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
                            <span className="text-blue-600 font-bold uppercase tracking-wide text-xs">
                                {news.category || "Tin tức"}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="text-muted-foreground">
                                {format(createdDate, "EEEE, dd/MM/yyyy, HH:mm", { locale: vi })} (GMT+7)
                            </span>
                        </div>
                        
                        <h1 className="text-3xl md:text-4xl lg:text-[2.5rem] font-bold text-gray-900 dark:text-gray-50 leading-tight mb-4">
                            {news.title}
                        </h1>

                        {/* Author info inline */}
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border">
                                <AvatarFallback className="bg-gray-100 text-gray-600 font-bold">{getInitials(authorName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-200">{authorName}</span>
                                <span className="text-xs text-muted-foreground">Người đăng</span>
                            </div>
                        </div>
                    </div>

                    {/* Ảnh bìa lớn */}
                    {news.cover_image_url && (
                        <div className="rounded-lg overflow-hidden mb-8 bg-gray-100 shadow-sm">
                            <img 
                                src={news.cover_image_url} 
                                alt={news.title} 
                                className="w-full h-auto object-cover max-h-[600px]"
                            />
                             <p className="text-xs text-gray-500 text-center py-2 italic bg-gray-50 border-t">
                                {news.title}
                            </p>
                        </div>
                    )}

                    {/* Nội dung bài viết (Prose Style - Báo chí) */}
                    <div className="prose prose-lg prose-gray dark:prose-invert max-w-none 
                        prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100
                        prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
                        prose-a:text-blue-600 hover:prose-a:text-blue-800 prose-a:no-underline hover:prose-a:underline
                        prose-img:rounded-lg prose-img:shadow-md">
                        <div dangerouslySetInnerHTML={{ __html: news.content }} />
                    </div>

                    {/* Thư viện ảnh phụ (nếu có) */}
                     {news.images && news.images.filter(img => img !== news.cover_image_url).length > 0 && (
                        <div className="mt-10">
                            <h3 className="text-xl font-bold mb-4 border-l-4 border-blue-600 pl-3">Hình ảnh khác</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {news.images.filter(img => img !== news.cover_image_url).map((img, idx) => (
                                    <div key={idx} className="rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90" onClick={() => window.open(img, '_blank')}>
                                        <img src={img} alt={`Gallery ${idx}`} className="w-full h-32 md:h-48 object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* File đính kèm (PDF) */}
                    {news.pdf_url && (
                        <div className="mt-10 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 rounded text-red-600">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Tài liệu đính kèm</h4>
                                        <p className="text-xs text-gray-500">Nhấn để xem trước hoặc tải về</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={togglePdfPreview} disabled={pdfLoading}>
                                        {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (showPdf ? "Đóng" : "Xem trước")}
                                    </Button>
                                    <Button size="sm" variant="secondary" asChild>
                                        <a href={pdfObjectUrl || news.pdf_url} download target="_blank" rel="noreferrer">
                                            <Download className="w-4 h-4" />
                                        </a>
                                    </Button>
                                </div>
                            </div>
                            
                            {showPdf && pdfObjectUrl && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }} 
                                    animate={{ height: 600, opacity: 1 }} 
                                    className="mt-4 rounded border overflow-hidden"
                                >
                                    <iframe src={pdfObjectUrl} className="w-full h-full" title="PDF Viewer" />
                                </motion.div>
                            )}
                        </div>
                    )}
                </motion.div>

                {/* CỘT PHẢI: SIDEBAR (4 phần) - Sticky */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="lg:sticky lg:top-20">
                        
                        {/* Sidebar Section */}
                        <div>
                            <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-primary/20">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white uppercase tracking-wide">
                                    Tin mới & Ghim
                                </h3>
                                <Pin className="w-4 h-4 text-red-500" />
                            </div>

                            <div className="flex flex-col">
                                {sidebarNews.length > 0 ? (
                                    sidebarNews.map((item) => (
                                        <SidebarNewsItem 
                                            key={item.id} 
                                            item={item} 
                                            onClick={() => navigate(`/news/${item.id}`)} 
                                        />
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">Không có tin nào khác.</p>
                                )}
                            </div>
                        </div>
                        
                        {/* Banner quảng cáo hoặc thông báo ngắn (Optional) */}
                        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 text-center">
                            <h4 className="font-bold text-blue-700 dark:text-blue-300 mb-2">Cổng thông tin Đồ án</h4>
                            <p className="text-sm text-blue-600/80 dark:text-blue-300/80 mb-4">
                                Theo dõi thường xuyên để cập nhật lịch bảo vệ và nộp hồ sơ đúng hạn.
                            </p>
                            <Button variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-100" onClick={() => navigate('/')}>
                                Về trang chủ
                            </Button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewsDetail;