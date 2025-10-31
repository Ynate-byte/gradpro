import React, { useState, useEffect, useRef } from "react";
import axios from "../../api/axiosConfig";
import { useParams, useNavigate } from "react-router-dom";
// Bỏ import NewsForm
import { Loader2, ArrowLeft, Share, Edit, Trash2, CalendarDays, UserCircle, FileText, Newspaper } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

// Lấy chữ cái đầu của tên
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

// Component chính
const NewsDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // ----- SỬA ĐỔI: Logic kiểm tra quyền -----
    const userRoleName = user?.vaitro?.TEN_VAITRO;
    const userPositionName = user?.giangvien?.CHUCVU;
    
    const canManageNews = 
        userRoleName === 'Admin' || 
        userRoleName === 'Trưởng khoa' || 
        userPositionName === 'Trưởng khoa' ||
        userRoleName === 'Giáo vụ' ||
        userPositionName === 'Giáo vụ';
    // ----- KẾT THÚC SỬA ĐỔI -----

    const [news, setNews] = useState(null);
    const [relatedNews, setRelatedNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pdfObjectUrl, setPdfObjectUrl] = useState(null);


    // Tải tin tức chính và tin liên quan khi 'id' thay đổi
    useEffect(() => {
        setNews(null);
        setRelatedNews([]);
        setPdfObjectUrl(null);
        setError(null);
        setLoading(true);

        fetchNews();
        fetchRelatedNews();
    }, [id]);

    // Tải file PDF
    useEffect(() => {
        if (loading || !news?.pdf_url) {
            if (pdfObjectUrl) {
                URL.revokeObjectURL(pdfObjectUrl);
                setPdfObjectUrl(null);
            }
            return;
        }

        let objectUrl = null;
        const fetchPdfBlob = async () => {
            try {
                const response = await axios.get(`/news/${id}/pdf`, { responseType: 'blob' });
                const file = new Blob([response.data], { type: 'application/pdf' });
                objectUrl = URL.createObjectURL(file);
                setPdfObjectUrl(objectUrl);
            } catch (err) {
                console.error("Failed to fetch PDF blob:", err);
                toast.error("Không thể tải file PDF đính kèm.");
            }
        };

        fetchPdfBlob();
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [id, news, loading]);

    const fetchNews = async () => {
        try {
            const res = await axios.get(`/news/${id}`);
            setNews(res.data);
        } catch (err) {
            setError(err.response?.data?.error || "Lỗi tải tin tức");
        } finally {
            setLoading(false);
        }
    };

    const fetchRelatedNews = async () => {
        try {
            const res = await axios.get("/news");
            const list = Array.isArray(res.data.data) ? res.data.data : [];
            const others = list
                .filter((item) => item.id !== Number(id))
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 5);
            setRelatedNews(others);
        } catch (err) {
            console.error("Lỗi tải tin liên quan:", err);
        }
    };

    // Hàm Sửa (chuyển về trang NewsPage với state)
    const handleEdit = () => {
        navigate("/news", { state: { editNewsId: news.id } });
    };

    const handleDelete = async () => {
        if (!window.confirm("Bạn có chắc muốn xóa tin này?")) return;
        try {
            await axios.delete(`/news/${id}`);
            toast.success("Đã xóa thành công!");
            navigate("/news"); // Quay về trang danh sách
        } catch (err) {
            toast.error("Xóa thất bại: " + (err.response?.data?.error || err.message));
        }
    };

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        toast.success("📎 Đã sao chép liên kết bài viết!");
    };
    
    // Check if an item is considered new
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
            <div className="flex justify-center items-center h-[calc(100vh-200px)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );

    if (error)
        return (
            <Card className="m-auto max-w-2xl border-destructive bg-destructive/10">
                <CardHeader>
                    <CardTitle className="text-destructive">Lỗi tải tin tức</CardTitle>
                    <CardDescription className="text-destructive/80">{error}</CardDescription>
                </CardHeader>
            </Card>
        );

    if (!news)
        return (
             <Card className="m-auto max-w-2xl">
                <CardHeader>
                    <CardTitle>Không tìm thấy</CardTitle>
                    <CardDescription>Tin tức bạn đang tìm không tồn tại.</CardDescription>
                </CardHeader>
            </Card>
        );

    const coverUrl = news.cover_image_url;
    const authorName = news.nguoi_tao?.ten || "Không rõ";
    const fullDate = news.created_at ? format(new Date(news.created_at), 'dd/MM/yyyy HH:mm', { locale: vi }) : 'N/A';
    const relativeDate = news.created_at ? formatDistanceToNow(new Date(news.created_at), { addSuffix: true, locale: vi }) : 'N/A';

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
            {/* Thanh điều hướng và nút */}
            <div className="flex items-center justify-between gap-4">
                <Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
                </Button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={handleShare}>
                        <Share className="h-4 w-4" />
                    </Button>
                    {/* ----- SỬA ĐỔI: Dùng canManageNews ----- */}
                    {canManageNews && (
                        <>
                            <Button variant="outline" onClick={handleEdit}>
                                <Edit className="mr-2 h-4 w-4" /> Sửa
                            </Button>
                            <Button variant="destructive" onClick={handleDelete}>
                                <Trash2 className="mr-2 h-4 w-4" /> Xóa
                            </Button>
                        </>
                    )}
                    {/* ----- KẾT THÚC SỬA ĐỔI ----- */}
                </div>
            </div>

            {/* Header bài viết */}
            <header className="space-y-4">
                {news.category && (
                    <Badge variant="default">{news.category.toUpperCase()}</Badge>
                )}
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                    {news.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback>{getInitials(authorName)}</AvatarFallback>
                        </Avatar>
                        <span>{authorName}</span>
                    </div>
                    <Separator orientation="vertical" className="h-5" />
                    <div className="flex items-center gap-2" title={fullDate}>
                        <CalendarDays className="h-4 w-4" />
                        <span>{relativeDate}</span>
                    </div>
                </div>
            </header>

            {/* Ảnh bìa */}
            {coverUrl && (
                <div className="rounded-lg overflow-hidden border bg-muted">
                    <img
                        src={coverUrl}
                        alt="Ảnh bìa"
                        className="w-full h-auto max-h-[500px] object-contain object-center"
                    />
                </div>
            )}

            {/* Nội dung bài viết */}
            <article className="prose prose-lg dark:prose-invert max-w-none text-foreground text-justify whitespace-pre-line">
                {news.content}
            </article>

            {/* Các ảnh phụ */}
            {news.images?.length > 0 && (
                <div className="space-y-6">
                    <Separator />
                    <h3 className="text-xl font-semibold">Hình ảnh đính kèm</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {news.images.map((img, idx) => {
                            if (!img || img === coverUrl) return null;
                            return (
                                <div key={idx} className="rounded-lg overflow-hidden border bg-muted">
                                    <img
                                        src={img}
                                        alt={`ảnh đính kèm ${idx + 1}`}
                                        className="w-full h-auto object-cover"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* File PDF */}
            {news.pdf_url && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-destructive" />
                            Tài liệu đính kèm
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!pdfObjectUrl ? (
                            <div className="w-full h-[600px] rounded-md flex items-center justify-center bg-muted">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                <p className="ml-2 text-muted-foreground">Đang tải PDF...</p>
                            </div>
                        ) : (
                            <iframe
                                src={pdfObjectUrl}
                                title="PDF Preview"
                                className="w-full h-[700px] rounded-md border"
                            ></iframe>
                        )}
                        <Button variant="link" asChild className="mt-2 px-0">
                            <a href={pdfObjectUrl || '#'} target="_blank" rel="noopener noreferrer" disabled={!pdfObjectUrl}>
                                Mở trong tab mới
                            </a>
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Tin liên quan */}
            {relatedNews.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Newspaper className="h-5 w-5" />
                           Tin tức liên quan
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {relatedNews.map((item) => (
                            <Button
                                key={item.id}
                                variant="ghost"
                                className="w-full justify-start h-auto p-3"
                                onClick={() => navigate(`/news/${item.id}`)}
                            >
                                <div className="flex items-center gap-3">
                                    {item.cover_image_url ? (
                                        <img src={item.cover_image_url} alt="cover" className="h-12 w-16 object-cover rounded-sm bg-muted flex-shrink-0" />
                                    ) : (
                                        <div className="h-12 w-16 rounded-sm bg-muted flex items-center justify-center flex-shrink-0">
                                            <Newspaper className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="text-left">
                                        <p className="font-medium leading-tight line-clamp-2">{item.title}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: vi })}
                                        </p>
                                    </div>
                                    {isNew(item.created_at) && <Badge variant="destructive" className="ml-auto animate-pulse">Mới</Badge>}
                                </div>
                            </Button>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default NewsDetail;