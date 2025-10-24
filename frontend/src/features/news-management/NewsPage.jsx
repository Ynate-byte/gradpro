import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from "../../contexts/AuthContext";
import NewsList from "./components/NewsList";
import NewsForm from "./components/NewsForm";
import { Newspaper, PlusCircle, X } from "lucide-react"; // Import thêm icon X
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// Xóa import Dialog vì không còn dùng

const NewsPage = () => {
    const { user } = useAuth();
    const isAdmin = user?.vaitro?.TEN_VAITRO === "Admin";

    // State này sẽ quyết định form nào đang hiển thị
    // null: không hiển thị form
    // {}: hiển thị form Thêm mới (trống)
    // {...news}: hiển thị form Sửa (đã điền dữ liệu)
    const [editingNews, setEditingNews] = useState(null);
    const [refresh, setRefresh] = useState(0);
    const formRef = useRef(null); // Ref để cuộn tới form khi Sửa

    // Hàm này được gọi khi NewsForm nhấn "Hủy" hoặc "Lưu" thành công
    const handleFormClose = (shouldRefresh = false) => {
        setEditingNews(null); // Ẩn form
        if (shouldRefresh) {
            setRefresh((prev) => prev + 1); // Tải lại danh sách tin tức
        }
    };

    // Kiểm tra xem form "Thêm mới" có đang mở hay không
    const isAdding = editingNews && !editingNews.id;

    // Xử lý nút "Thêm tin tức mới"
    const handleToggleAddForm = () => {
        if (isAdding) {
            setEditingNews(null); // Nếu đang mở form "Thêm", thì đóng lại
        } else {
            setEditingNews({}); // Nếu không, mở form "Thêm" (trống)
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Cuộn lên đầu trang
        }
    };

    // Xử lý khi nhấn nút "Sửa" từ NewsList
    const handleEdit = (newsItem) => {
        setEditingNews(newsItem);
        // Cuộn tới form
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100); // Đợi 1 chút để form render
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
                {isAdmin && (
                    <Button onClick={handleToggleAddForm}>
                        {isAdding ? <X className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        {isAdding ? "Hủy Thêm mới" : "Thêm tin tức mới"}
                    </Button>
                )}
            </div>

            {/* Vùng hiển thị Form (inline) */}
            {isAdmin && editingNews && (
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
                            {/* Dùng `key` để React tự động reset component NewsForm 
                                khi chuyển từ "Sửa" sang "Thêm" hoặc ngược lại.
                            */}
                            <NewsForm
                                key={editingNews.id || 'new'}
                                news={editingNews.id ? editingNews : null}
                                onSuccess={() => handleFormClose(true)} // Lưu thành công: Đóng form và refresh list
                                onCancel={() => handleFormClose(false)} // Hủy: Chỉ đóng form
                            />
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Danh sách tin tức */}
            <Card>
                <CardHeader>
                    <CardTitle>Danh sách tin tức</CardTitle>
                    <CardDescription>Các tin tức mới nhất sẽ được hiển thị đầu tiên.</CardDescription>
                </CardHeader>
                <CardContent>
                    <NewsList
                        onEdit={isAdmin ? handleEdit : null} // Truyền hàm handleEdit xuống
                        refresh={refresh}
                        showActions={isAdmin}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default NewsPage;