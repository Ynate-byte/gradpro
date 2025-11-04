import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BookOpen, Users, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import lecturerQuotaService from '@/api/lecturerQuotaService';
import axios from '@/api/axiosConfig';
import { useAuth } from '@/contexts/AuthContext';
// ===== THAY ĐỔI 1: Import lại component Quản lý =====
import LecturerQuotaManager from "./components/QuotaManager";

const LecturerQuotaManagementPage = () => {
    const { user } = useAuth();
    const isDepartmentHead = user?.giangvien?.CHUCVU === 'Trưởng bộ môn';

    // Always declare hooks at the top level
    const [myQuota, setMyQuota] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState('');
    const [plans, setPlans] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Load plans when component mounts
    useEffect(() => {
        // ===== THAY ĐỔI 2: Chỉ load plans nếu LÀ Giảng viên thường =====
        // (Trưởng bộ môn sẽ load plans bên trong component <LecturerQuotaManager />)
        if (!isDepartmentHead) {
            loadPlans();
        }
    }, [isDepartmentHead]);

    // Load quota data when selectedPlan changes
    useEffect(() => {
        // ===== THAY ĐỔI 3: Chỉ load quota cá nhân nếu LÀ Giảng viên thường =====
        if (!isDepartmentHead && selectedPlan) {
            loadMyQuota();
        } else if (!isDepartmentHead) {
            setMyQuota(null);
        }
    }, [selectedPlan, isDepartmentHead]);

    // ===== THAY ĐỔI 4: KHÔI PHỤC LẠI LOGIC if (isDepartmentHead) =====
    // (Đây là logic tôi đã xóa nhầm ở bước trước)
    if (isDepartmentHead) {
        return <LecturerQuotaManager />;
    }
    // ===== KẾT THÚC THAY ĐỔI 4 =====

    const loadPlans = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('/admin/thesis-plans/list-all');
            setPlans(response.data);

            // Auto select first plan if available
            if (response.data.length > 0 && !selectedPlan) {
                setSelectedPlan(response.data[0].ID_KEHOACH);
            }
        } catch (error) {
            console.error('Error loading plans:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMyQuota = async () => {
        if (!selectedPlan) return;
        setIsLoading(true);
        try {
            const response = await lecturerQuotaService.getMyQuota({ plan_id: selectedPlan });
            setMyQuota(response.data);
        } catch (error) {
            toast.error('Lỗi khi tải thông tin quota của bạn');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const getQuotaStatus = (assigned, created) => {
        if (assigned === 0) return <Badge variant="outline">Chưa phân công</Badge>;
        if (created >= assigned) return <Badge className="bg-green-500 hover:bg-green-600 text-white">Đủ</Badge>;
        return <Badge variant="default">Còn {assigned - created}</Badge>;
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-blue-500">
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <p>Đang tải dữ liệu...</p>
                </div>
            );
        }

        if (!selectedPlan) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-gray-50 rounded-lg p-6 border-2 border-dashed">
                    <BookOpen className="h-8 w-8 mb-4 text-orange-500" />
                    <p className="text-lg font-semibold">Vui lòng chọn một Kế hoạch Khóa luận để xem thông tin quota.</p>
                    {plans.length === 0 && <p className="text-sm mt-2">Hiện tại không có Kế hoạch nào được tạo.</p>}
                </div>
            );
        }

        if (!myQuota) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <p>Không có thông tin quota cho kế hoạch này.</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {/* Quota Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Quota Được Giao</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{myQuota.quota_assigned || 0}</div>
                            <p className="text-xs text-muted-foreground">Số đề tài tối đa</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Đề Tài Đã Tạo</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{myQuota.topics_created || 0}</div>
                            <p className="text-xs text-muted-foreground">Đã duyệt/Chờ duyệt</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Cần Tạo Thêm</CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{myQuota.topics_needed || 0}</div>
                            <p className="text-xs text-muted-foreground">Để đạt quota</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Trạng Thái</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-2">
                                {getQuotaStatus(myQuota.quota_assigned || 0, myQuota.topics_created || 0)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {myQuota.actual_assigned || 0} đề tài đã phân công
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Additional Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Thông Tin Chi Tiết</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Quota còn lại để phân công:</p>
                                <p className="text-lg font-semibold text-blue-600">
                                    {myQuota.remaining_quota || 0} đề tài
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Tổng đề tài đã phân công:</p>
                                <p className="text-lg font-semibold text-green-600">
                                    {myQuota.actual_assigned || 0} đề tài
                                </p>
                            </div>
                        </div>

                        {/* Department Quota Info */}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <h4 className="text-md font-semibold text-gray-800 mb-3">Thông Tin Bộ Môn</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Quota bộ môn:</p>
                                    <p className="text-lg font-semibold text-purple-600">
                                        {myQuota.department_quota || 0} đề tài
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Đã phân công:</p>
                                    <p className="text-lg font-semibold text-orange-600">
                                        {myQuota.department_assigned || 0} đề tài
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Còn lại:</p>
                                    <p className="text-lg font-semibold text-indigo-600">
                                        {myQuota.department_remaining || 0} đề tài
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Plan Selection */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        <span>Thông Tin Quota Cá Nhân</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <label className="text-sm font-medium whitespace-nowrap">Chọn Kế hoạch Khóa luận:</label>
                        <select
                            value={selectedPlan}
                            onChange={(e) => setSelectedPlan(e.target.value)}
                            disabled={isLoading}
                            className="w-[300px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Chọn kế hoạch</option>
                            {plans.map(plan => (
                                <option key={plan.ID_KEHOACH} value={plan.ID_KEHOACH}>
                                    {plan.TEN_DOT} - {plan.NAMHOC}
                                </option>
                            ))}
                        </select>
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                    </div>
                </CardContent>
            </Card>

            {/* Main Content */}
            {renderContent()}
        </div>
    );
};

export default LecturerQuotaManagementPage;