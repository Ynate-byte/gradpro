import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from "../../contexts/AuthContext";
import NewsList from "./components/NewsList";
import NewsForm from "./components/NewsForm";
import { Newspaper, PlusCircle, X } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLocation } from 'react-router-dom';

const NewsPage = () => {
    const { user } = useAuth();
    const location = useLocation();

    // Logic kiểm tra quyền
    const userRoleName = user?.vaitro?.TEN_VAITRO;
    const positionCodes = user?.giangvien?.chucvus?.map(cv => cv.MA_CHUCVU) || [];

    const canManageNews = 
    userRoleName === 'Admin' || 
    userRoleName === 'Trưởng khoa' || 
    positionCodes.includes('TRUONG_KHOA') || 
    userRoleName === 'Giáo vụ' || 
    positionCodes.includes('GIAO_VU');

    const [editingNews, setEditingNews] = useState(null);
    const [refresh, setRefresh] = useState(0);
    const formRef = useRef(null);

     useEffect(() => {
        if (location.state?.editNewsId) {
             setEditingNews({ id: location.state.editNewsId });
             setTimeout(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [location.state]);

    const handleFormClose = (shouldRefresh = false) => {
        setEditingNews(null);
        if (shouldRefresh) {
            setRefresh((prev) => prev + 1);
        }
        if (location.state?.editNewsId) {
             window.history.replaceState({}, document.title)
        }
    };

    const isAdding = editingNews && !editingNews.id;

    const handleToggleAddForm = () => {
        if (isAdding) {
            setEditingNews(null);
        } else {
            setEditingNews({}); 
            // Scroll to top of container instead of window
            document.getElementById('news-container')?.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleEdit = (newsItem) => {
        setEditingNews(newsItem);
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    return (
        // [FIX SCROLL] Thêm id để tham chiếu scroll và class h-full overflow-y-auto
        <div id="news-container" className="h-full overflow-y-auto space-y-8 p-4 md:p-8">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">         
                {canManageNews && (
                    <Button onClick={handleToggleAddForm} className="shadow-lg">
                        {isAdding ? <X className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        {isAdding ? "Hủy Thêm mới" : "Thêm tin tức mới"}
                    </Button>
                )}
            </div>

            {/* Vùng hiển thị Form (inline) */}
            {canManageNews && editingNews && (
                <div ref={formRef} className="scroll-mt-20">
                    <Card className="border-primary/40 shadow-lg animate-in fade-in-50 duration-300">
                        <CardHeader className="bg-primary/5 border-b">
                            <CardTitle>
                                {editingNews.id ? "Chỉnh sửa Tin tức" : "Tạo Tin tức mới"}
                            </CardTitle>
                            <CardDescription>
                                {editingNews.id ? "Cập nhật thông tin bài viết." : "Điền thông tin để tạo bài viết mới."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <NewsForm
                                key={editingNews.id || 'new'}
                                news={editingNews.id ? editingNews : null}
                                onSuccess={() => handleFormClose(true)}
                                onCancel={() => handleFormClose(false)}
                            />
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Danh sách tin tức */}
            <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/10">
                    <CardTitle>Danh sách tin tức</CardTitle>
                    <CardDescription>Các tin tức mới nhất sẽ được hiển thị đầu tiên.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <NewsList
                        onEdit={canManageNews ? handleEdit : null}
                        refresh={refresh}
                        showActions={canManageNews}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default NewsPage;