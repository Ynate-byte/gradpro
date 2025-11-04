import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Users, BookOpen, Layers, Info } from 'lucide-react';
import { toast } from 'sonner';
// [SỬA] Import đúng service cho Giảng viên/Trưởng BM
import lecturerQuotaService from '@/api/lecturerQuotaService'; 
import axios from '@/api/axiosConfig';

const QuotaManager = () => {
    // [SỬA] Đổi tên state cho rõ ràng
    const [departmentQuotaInfo, setDepartmentQuotaInfo] = useState({});
    const [lecturers, setLecturers] = useState([]);
    const [selectedLecturerId, setSelectedLecturerId] = useState('');
    
    const [quotaAmount, setQuotaAmount] = useState('');
    const [note, setNote] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('');
    const [plans, setPlans] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false); // Thêm state cho submit

    useEffect(() => {
        loadPlans();
    }, []);

    useEffect(() => {
        if (selectedPlan) {
            loadData();
        } else {
            setDepartmentQuotaInfo({});
            setLecturers([]);
        }
    }, [selectedPlan]);

    const loadPlans = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('/admin/thesis-plans/list-all');
            setPlans(response.data);
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
            // [SỬA] Gọi API lấy danh sách giảng viên của Trưởng BM
            const response = await lecturerQuotaService.getLecturers({ plan_id: selectedPlan });
            setDepartmentQuotaInfo(response.data);
            setLecturers(response.data.lecturers || []);
        } catch (error) {
            toast.error('Lỗi khi tải dữ liệu giảng viên');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // [SỬA] Hàm Phân công thủ công cho Giảng viên
    const handleAssignQuota = async () => {
        if (!selectedLecturerId || quotaAmount === '' || !selectedPlan) {
            toast.error('Vui lòng chọn kế hoạch, giảng viên và nhập số lượng đề tài');
            return;
        }

        setIsSubmitting(true);
        try {
            await lecturerQuotaService.assignLecturerQuota({
                ID_KEHOACH: selectedPlan,
                ID_GIANGVIEN: selectedLecturerId,
                SO_DETAI_QUOTA: parseInt(quotaAmount),
                GHICHU: note
            });

            toast.success('Cập nhật quota cho giảng viên thành công');
            setSelectedLecturerId('');
            setQuotaAmount('');
            setNote('');
            loadData(); // Tải lại dữ liệu
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi phân công đề tài');
        } finally {
            setIsSubmitting(false);
        }
    };

    // [SỬA] Hàm Phân công tự động cho Giảng viên
    const handleAutoAssignQuotas = async () => {
        if (!selectedPlan) {
            toast.error('Vui lòng chọn kế hoạch');
            return;
        }

        setIsSubmitting(true);
        try {
            await lecturerQuotaService.autoAssignLecturerQuotas({
                ID_KEHOACH: selectedPlan
            });

            toast.success('Tự động phân công đề tài cho giảng viên thành công');
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi tự động phân công');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getQuotaStatus = (quota, actual) => {
        if (quota === 0) return <Badge variant="outline">Chưa phân công</Badge>;
        if (actual >= quota) return <Badge className="bg-green-500 hover:bg-green-600 text-white">Đủ</Badge>;
        return <Badge variant="default">Còn {quota - actual}</Badge>;
    };

    // [SỬA] StatCard mới cho Trưởng BM
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

    const renderContent = () => {
        if (isLoading && !isSubmitting) { // Chỉ hiển thị loading toàn trang khi loadData
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

        // [SỬA] Giao diện khi có kế hoạch được chọn (UI Trưởng BM)
        const totalDeptQuota = departmentQuotaInfo.department_quota || 0;
        const totalAssignedToLecturers = lecturers.reduce((sum, gv) => sum + (gv.quota_assigned || 0), 0);
        const remainingForDept = totalDeptQuota - totalAssignedToLecturers;

        return (
            <div className="space-y-6">
                {/* 1. Tổng quan Bộ môn */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard
                        title="Tổng Quota Bộ môn"
                        value={totalDeptQuota}
                        subText="Tổng số đề tài được Admin giao"
                    />
                    <StatCard
                        title="Đã Phân công (GV)"
                        value={totalAssignedToLecturers}
                        subText={`Đã phân cho ${lecturers.length} giảng viên`}
                    />
                    <StatCard
                        title="Quota Bộ môn Còn lại"
                        value={remainingForDept}
                        subText="Chưa phân cho giảng viên"
                    />
                </div>

                {/* 2. TỰ ĐỘNG PHÂN CÔNG */}
                <Card>
                    <CardHeader>
                        <CardTitle>Tự động Phân công (Giảng viên)</CardTitle>
                        <CardDescription>
                            Chia đều <span className="font-bold text-blue-600">{totalDeptQuota}</span> đề tài của bộ môn cho <span className="font-bold text-blue-600">{lecturers.length}</span> giảng viên.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                            <div className="text-sm text-gray-700">
                                <strong>Tổng đề tài cần phân bổ:</strong> <span className="font-bold text-lg text-purple-600">{totalDeptQuota}</span>
                                <p className="text-xs text-gray-500 mt-1">Lưu ý: Thao tác này sẽ ghi đè lên tất cả quota thủ công của giảng viên trong kế hoạch này.</p>
                            </div>
                            <Button
                                onClick={handleAutoAssignQuotas}
                                disabled={!selectedPlan || isLoading || isSubmitting || totalDeptQuota === 0}
                                className="bg-red-600 hover:bg-red-700 transition duration-150"
                            >
                                {isSubmitting ? (<Loader2 className="mr-2 h-5 w-5 animate-spin" />) : null}
                                Tự động phân công (GV)
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. ĐIỀU CHỈNH THỦ CÔNG (Giảng viên) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Điều chỉnh Thủ công (Giảng viên)</CardTitle>
                        <CardDescription>
                            Cập nhật số lượng quota đề tài tối đa cho từng giảng viên.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                            {/* Chọn Giảng viên */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Giảng viên</label>
                                <Select
                                    value={selectedLecturerId.toString()}
                                    onValueChange={(value) => setSelectedLecturerId(value)}
                                    disabled={!selectedPlan || isLoading || isSubmitting || lecturers.length === 0}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn giảng viên" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {lecturers.map(gv => (
                                            <SelectItem key={gv.ID_GIANGVIEN} value={gv.ID_GIANGVIEN.toString()}>
                                                {gv.TEN_GIANGVIEN} ({gv.HOCVI})
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
                                    disabled={!selectedPlan || isLoading || isSubmitting}
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
                                    disabled={!selectedPlan || isLoading || isSubmitting}
                                />
                            </div>

                            {/* Nút Cập nhật */}
                            <Button
                                onClick={handleAssignQuota}
                                disabled={!selectedLecturerId || quotaAmount === '' || !selectedPlan || isLoading || isSubmitting}
                            >
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Cập nhật (GV)
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. BẢNG CHI TIẾT QUOTA GIẢNG VIÊN */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bảng Chi tiết Quota Giảng viên</CardTitle>
                        <CardDescription>Tổng hợp quota đã được giao và tình trạng sử dụng đề tài của từng giảng viên.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {lecturers.length === 0 ? (
                            <div className="py-4 text-center text-gray-500">
                                Không có giảng viên nào trong Bộ môn này.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-100 hover:bg-gray-100">
                                        <TableHead className="w-[30%]">Giảng viên</TableHead>
                                        <TableHead>Học vị</TableHead>
                                        <TableHead className="text-center font-bold text-blue-700">Quota Được Giao</TableHead>
                                        <TableHead className="text-center">Đề tài Đã Tạo</TableHead>
                                        <TableHead className="text-center">Trạng Thái</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lecturers.map(gv => (
                                        <TableRow key={gv.ID_GIANGVIEN} className="hover:bg-blue-50/50">
                                            <TableCell className="font-semibold">{gv.TEN_GIANGVIEN}</TableCell>
                                            <TableCell>{gv.HOCVI || 'N/A'}</TableCell>
                                            <TableCell className="text-center font-bold text-blue-600">
                                                {gv.quota_assigned || 0}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {gv.topics_created || 0}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {getQuotaStatus(gv.quota_assigned || 0, gv.topics_created || 0)}
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
                        <span>Phân công Đề tài cho Giảng viên</span>
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
                                    <SelectItem key={plan.ID_KEHOACH} value={plan.ID_KEHOACH.toString()}>
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