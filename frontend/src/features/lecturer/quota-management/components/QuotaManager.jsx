import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Users, BookOpen, Layers, ArrowDownUp, Info } from 'lucide-react';
import { toast } from 'sonner';
import quotaService from '@/api/quotaService';
import axios from '@/api/axiosConfig';

const QuotaManager = () => {
    const [statistics, setStatistics] = useState({});
    const [departments, setDepartments] = useState([]);
    const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
    const [quotaAmount, setQuotaAmount] = useState('');
    const [note, setNote] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('');
    const [plans, setPlans] = useState([]);
    const [isLoading, setIsLoading] = useState(false); // Thêm loading state



    // --- LOẠI BỎ HÀM loadData TRONG useEffect THỨ NHẤT ---
    // Chỉ gọi loadPlans khi component mount
    useEffect(() => {
        loadPlans();
    }, []);

    // Chỉ gọi loadData khi selectedPlan thay đổi (hoặc mới được set lần đầu)
    useEffect(() => {
        if (selectedPlan) {
            loadData();
        } else {
            // Reset dữ liệu nếu không có kế hoạch được chọn
            setStatistics({});
            setDepartments([]);
        }
    }, [selectedPlan]);
    // --------------------------------------------------------

    const loadPlans = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('/admin/thesis-plans/list-all');
            setPlans(response.data);

            // TỰ ĐỘNG CHỌN KẾ HOẠCH ĐẦU TIÊN NẾU CÓ
            if (response.data.length > 0 && !selectedPlan) {
                setSelectedPlan(response.data[0].ID_KEHOACH);
            }
        } catch (error) {
            console.error('Lỗi khi tải danh sách kế hoạch:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadData = async () => {
        if (!selectedPlan) return;
        setIsLoading(true);
        try {
            const [statsRes, departmentsRes] = await Promise.all([
                quotaService.getStatistics({ plan_id: selectedPlan }),
                quotaService.getDepartments({ plan_id: selectedPlan })
            ]);

            setStatistics(statsRes.data);
            setDepartments(departmentsRes.data);
        } catch (error) {
            toast.error('Lỗi khi tải dữ liệu thống kê');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // Hàm Phân công thủ công (Logic giữ nguyên, sửa lỗi nhỏ về state)
    const handleAssignQuota = async () => {
        if (!selectedDepartmentId || quotaAmount === '' || !selectedPlan) {
            toast.error('Vui lòng chọn kế hoạch, khoa/bộ môn và nhập số lượng đề tài');
            return;
        }

        try {
            await quotaService.assignDepartmentQuota({
                ID_KEHOACH: selectedPlan,
                ID_KHOA_BOMON: selectedDepartmentId, // Đã sửa
                SO_DETAI_QUOTA: parseInt(quotaAmount),
                GHICHU: note
            });

            toast.success('Cập nhật quota đề tài thành công');
            setSelectedDepartmentId('');
            setQuotaAmount('');
            setNote('');
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi phân công  đề tài');
        }
    };

    // Hàm Phân công tự động (Logic giữ nguyên)
    const handleAutoAssignQuotas = async () => {
        if (!selectedPlan) {
            toast.error('Vui lòng chọn kế hoạch');
            return;
        }

        setIsLoading(true);
        try {
            await quotaService.autoAssignQuotas({
                ID_KEHOACH: selectedPlan
            });

            toast.success('Tự động phân công  đề tài thành công');
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi tự động phân công đề tài');
        } finally {
            setIsLoading(false);
        }
    };

    const getQuotaStatus = (quota, actual) => {
        if (quota === 0) return <Badge variant="outline">Chưa phân công</Badge>;
        if (actual >= quota) return <Badge className="bg-green-500 hover:bg-green-600 text-white">Đủ</Badge>;
        return <Badge variant="default">Còn {quota - actual}</Badge>;
    };

    const StatCard = ({ title, value, subText }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {subText && <p className="text-xs text-gray-500">{subText}</p>}
            </CardContent>
        </Card>
    );

    // --- HIỂN THỊ THÔNG BÁO KHI CHƯA CÓ KẾ HOẠCH ---
    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-blue-500">
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <p>Đang tải dữ liệu kế hoạch...</p>
                </div>
            );
        }

        if (!selectedPlan) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-gray-50 rounded-lg p-6 border-2 border-dashed">
                    <Info className="h-8 w-8 mb-4 text-orange-500" />
                    <p className="text-lg font-semibold">Vui lòng chọn một Kế hoạch Khóa luận để bắt đầu quản lý Quota.</p>
                    {plans.length === 0 && <p className="text-sm mt-2">Hiện tại không có Kế hoạch nào được tạo.</p>}
                </div>
            );
        }

        // Nếu có selectedPlan, hiển thị nội dung quản lý bình thường
        return (
            <div className="space-y-6">

                {/* 1. Kế hoạch & Tổng quan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Tổng sinh viên"
                        value={statistics.overview?.total_students || 0}
                    />
                    <StatCard
                        title="Tổng nhóm"
                        value={statistics.overview?.total_groups || 0}
                    />
                    <StatCard
                        title="Số nhóm dự kiến"
                        value={statistics.overview?.expected_groups || 0}
                    />
                    <StatCard
                        title="Đề tài cần ra (1.5x)"
                        value={statistics.overview?.required_topics || 0}
                        subText="Target đề tài tối thiểu"
                    />
                </div>

                {/* 2. TỰ ĐỘNG PHÂN CÔNG */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tự động Phân công</CardTitle>
                        <CardDescription>
                            Sử dụng chức năng này để phân bổ đề tài đều cho các Khoa/Bộ môn dựa trên tổng số đề tài cần ra.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                            <div className="text-sm text-gray-700">
                                **Tổng đề tài cần phân bổ:** <span className="font-bold text-lg text-purple-600">{statistics.overview?.required_topics || 0}</span>
                                <p className="text-xs text-gray-500 mt-1">Lưu ý: Thao tác này sẽ ghi đè lên tất cả quota thủ công cho kế hoạch đã chọn.</p>
                            </div>
                            <Button
                                onClick={handleAutoAssignQuotas}
                                disabled={!selectedPlan || isLoading}
                                className="bg-red-600 hover:bg-red-700 transition duration-150"
                            >
                                {isLoading ? (<Loader2 className="mr-2 h-5 w-5 animate-spin" />) : null}
                                Tự động phân công
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. ĐIỀU CHỈNH THỦ CÔNG */}
                <Card>
                    <CardHeader>
                        <CardTitle>Điều chỉnh Thủ công</CardTitle>
                        <CardDescription>
                            Cập nhật số lượng quota đề tài tối đa cho từng Khoa/Bộ môn theo nhu cầu cụ thể.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                            {/* Chọn Khoa/Bộ môn */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Khoa/Bộ môn</label>
                                <Select
                                    value={selectedDepartmentId.toString()}

                                    onValueChange={(value) => {
                                        setSelectedDepartmentId(value);
                                        // Auto-fill remaining quota when department is selected
                                        const totalRequired = statistics.overview?.required_topics || 0;
                                        const totalAssigned = departments.reduce((sum, dept) => sum + (dept.quota_assigned || 0), 0);
                                        const remainingQuota = totalRequired - totalAssigned;
                                        if (remainingQuota > 0) {
                                            setQuotaAmount(remainingQuota.toString());
                                        }
                                    }}
                                    disabled={!selectedPlan || isLoading || departments.length === 0}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn khoa/bộ môn" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map(dept => (
                                            <SelectItem key={dept.ID_KHOA_BOMON} value={dept.ID_KHOA_BOMON.toString()}>
                                                {dept.TEN_KHOA_BOMON}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Số đề tài Quota */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Quota (Số đề tài)</label>
                                <Input
                                    type="number"
                                    placeholder="Số lượng"
                                    value={quotaAmount}
                                    onChange={(e) => setQuotaAmount(e.target.value)}
                                    min="0"
                                    disabled={!selectedPlan || isLoading}
                                />
                            </div>

                            {/* Ghi chú */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Ghi chú (tùy chọn)</label>
                                <Textarea
                                    placeholder="Lý do điều chỉnh (nếu có)"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    rows={1}
                                    disabled={!selectedPlan || isLoading}
                                />
                            </div>

                            {/* Nút Cập nhật */}
                            <Button
                                onClick={handleAssignQuota}
                                disabled={!selectedDepartmentId || quotaAmount === '' || !selectedPlan || isLoading}
                            >
                                Cập nhật
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. BẢNG CHI TIẾT QUOTA BỘ MÔN */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bảng Chi tiết Quota Bộ môn</CardTitle>
                        <CardDescription>Tổng hợp quota đã được giao và tình trạng sử dụng đề tài của từng khoa/bộ môn.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {departments.length === 0 ? (
                            <div className="py-4 text-center text-gray-500">
                                Không có Khoa/Bộ môn nào tham gia Kế hoạch này.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-100 hover:bg-gray-100">
                                        <TableHead className="w-[30%]">Khoa/Bộ môn</TableHead>
                                        <TableHead className="text-center">Số GV</TableHead>
                                        <TableHead className="text-center font-bold text-blue-700">Được Giao</TableHead>
                                        <TableHead className="text-center">Đề tài Đã Tạo</TableHead>
                                        <TableHead className="text-center">Trạng Thái</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {departments.map(dept => (
                                        <TableRow key={dept.ID_KHOA_BOMON} className="hover:bg-blue-50/50">
                                            <TableCell className="font-semibold">{dept.TEN_KHOA_BOMON}</TableCell>
                                            <TableCell className="text-center">{dept.total_lecturers || 0}</TableCell>
                                            <TableCell className="text-center font-bold text-blue-600">
                                                {dept.quota_assigned || 0}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {dept.actual_created || 0}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {getQuotaStatus(dept.quota_assigned || 0, dept.actual_created || 0)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    };
    // --- KẾT THÚC RENDER CONTENT ---

    return (
        <div className="space-y-6">

            {/* 1. Khu vực Chọn Kế hoạch (Luôn hiển thị) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Layers className="h-5 w-5 text-blue-600" />
                        <span>Quản lý Phân công Đề tài Khóa luận</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <label className="text-sm font-medium whitespace-nowrap">Chọn Kế hoạch Khóa luận:</label>
                        <Select
                            value={selectedPlan}
                            onValueChange={setSelectedPlan}
                            disabled={isLoading}
                        >
                            <SelectTrigger className="w-[300px]">
                                <SelectValue placeholder="Chọn kế hoạch" />
                            </SelectTrigger>
                            <SelectContent>
                                {plans.map(plan => (
                                    <SelectItem key={plan.ID_KEHOACH} value={plan.ID_KEHOACH}>
                                        {plan.TEN_DOT} - {plan.NAMHOC}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                    </div>
                </CardContent>
            </Card>

            {/* 2. Nội dung chính (Điều kiện) */}
            {renderContent()}
        </div>
    );
};

export default QuotaManager;