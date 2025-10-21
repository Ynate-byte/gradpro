import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    Users,
    BookCopy,
    FileText,
    Activity
} from 'lucide-react';

// Component hiển thị thẻ thống kê số liệu
const StatCard = ({ icon: Icon, title, value, change }) => (
    <div className="bg-card text-card-foreground p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{change}</p>
    </div>
);

// Component chính của trang chủ
function HomePage() {
    const { user } = useAuth();

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground">
                    Chào mừng trở lại, {user ? user.HODEM_VA_TEN : 'bạn'}!
                </h1>
                <p className="text-muted-foreground mt-1">
                    Đây là tổng quan nhanh về dự án của bạn.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={Users} title="Tổng sinh viên" value="1,250" change="+12% so với tháng trước" />
                <StatCard icon={BookCopy} title="Đề tài đã duyệt" value="320" change="+5.2% so với tháng trước" />
                <StatCard icon={FileText} title="Báo cáo đã nộp" value="189" change="-2.1% so với tháng trước" />
                <StatCard icon={Activity} title="Hoạt động gần đây" value="76" change="trong 24 giờ qua" />
            </div>

            <div className="bg-card overflow-hidden shadow-sm rounded-lg border">
                <div className="p-6 text-card-foreground">
                    <h3 className="font-semibold mb-2">Thông báo quan trọng</h3>
                    <p className="text-sm text-muted-foreground">
                        Hạn chót đăng ký đề tài cho học kỳ mới là ngày 30/10/2025. Vui lòng hoàn tất đăng ký trước thời hạn.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default HomePage;