import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from "../../contexts/AuthContext";
import NewsList from "./components/NewsList";
import NewsForm from "./components/NewsForm";
import { Newspaper, PlusCircle, X } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLocation } from 'react-router-dom'; // <-- THÊM MỚI

const NewsPage = () => {
    const { user } = useAuth();
    const location = useLocation(); // <-- THÊM MỚI: Để lấy state từ NewsDetail

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


    const [editingNews, setEditingNews] = useState(null);
    const [refresh, setRefresh] = useState(0);
    const formRef = useRef(null);

     // ----- THÊM MỚI: Xử lý khi điều hướng từ NewsDetail về -----
     useEffect(() => {
        if (location.state?.editNewsId) {
            // Cần một cách để lấy chi tiết tin tức từ ID
            // Tạm thời, chúng ta chỉ mở form Sửa với ID.
            // Tốt hơn là NewsList sẽ fetch và tìm item đó.
            // Cách đơn giản nhất là set editingNews với ID
            // Nhưng NewsForm cần full object...
            // Giải pháp tạm: reload trang list, component NewsList sẽ tải lại
            // và chúng ta cần trigger onEdit từ NewsList.
            // Lần này chúng ta sẽ mở form trống, và NewsForm sẽ tự tải.
             setEditingNews({ id: location.state.editNewsId }); // NewsForm sẽ tự fetch data
             setTimeout(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [location.state]);
     // ----- KẾT THÚC THÊM MỚI -----


    const handleFormClose = (shouldRefresh = false) => {
        setEditingNews(null);
        if (shouldRefresh) {
            setRefresh((prev) => prev + 1);
        }
        // Xóa state khỏi location
        if (location.state?.editNewsId) {
             window.history.replaceState({}, document.title)
        }
    };

    const isAdding = editingNews && !editingNews.id;

    const handleToggleAddForm = () => {
        if (isAdding) {
            setEditingNews(null);
        } else {
            setEditingNews({}); // Mở form "Thêm" (trống)
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleEdit = (newsItem) => {
        setEditingNews(newsItem);
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    return (
        <div className="space-y-8 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Newspaper className="w-8 h-8 text-primary" />
                    <div>
                        <h1 className="text-3xl font-bold">Quản lý Tin tức</h1>
                        <p className="text-muted-foreground">Xem, thêm, sửa, xóa các bài viết tin tức.</p>
                    </div>
                </div>
                {/* ----- SỬA ĐỔI: Dùng canManageNews ----- */}
                {canManageNews && (
                    <Button onClick={handleToggleAddForm}>
                        {isAdding ? <X className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        {isAdding ? "Hủy Thêm mới" : "Thêm tin tức mới"}
                    </Button>
                )}
                {/* ----- KẾT THÚC SỬA ĐỔI ----- */}
            </div>

            {/* Vùng hiển thị Form (inline) */}
            {/* ----- SỬA ĐỔI: Dùng canManageNews ----- */}
            {canManageNews && editingNews && (
                <div ref={formRef}>
                    <Card className="border-primary/40 shadow-lg animate-in fade-in-50 duration-300">
                        <CardHeader>
                            <CardTitle>
                                {editingNews.id ? "Chỉnh sửa Tin tức" : "Tạo Tin tức mới"}
                            </CardTitle>
                            <CardDescription>
                                {editingNews.id ? "Cập nhật thông tin bài viết." : "Điền thông tin để tạo bài viết mới."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
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
            {/* ----- KẾT THÚC SỬA ĐỔI ----- */}

            {/* Danh sách tin tức */}
            <Card>
                <CardHeader>
                    <CardTitle>Danh sách tin tức</CardTitle>
                    <CardDescription>Các tin tức mới nhất sẽ được hiển thị đầu tiên.</CardDescription>
                </CardHeader>
                <CardContent>
                    <NewsList
                        // ----- SỬA ĐỔI: Dùng canManageNews -----
                        onEdit={canManageNews ? handleEdit : null}
                        refresh={refresh}
                        showActions={canManageNews}
                        // ----- KẾT THÚC SỬA ĐỔI -----
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default NewsPage;