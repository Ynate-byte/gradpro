import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Users, BookOpen, Layers, AlertTriangle, Save, RotateCcw, RotateCw, Info, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import quotaService from '@/api/quotaService';
import axios from '@/api/axiosConfig';
import { getThesisPlanById } from '@/api/thesisPlanService';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // [NEW] Import AlertDialog

// --- Component hiển thị Card thống kê (Giữ nguyên) ---
const StatCard = ({ icon: Icon, title, value, description, iconBgClass, iconColorClass }) => (
	<motion.div
		className="bg-card text-card-foreground p-4 rounded-lg shadow-sm border flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:scale-[1.01]"
		whileHover={{ y: -4 }}
		transition={{ type: "spring", stiffness: 300, damping: 20 }}
	>
		<motion.div
			className={cn("p-3 rounded-lg", iconBgClass)}
			animate={{
				scale: value === 'loading' ? [1, 1.08, 1] : 1,
				rotate: value === 'loading' ? [0, 5, -5, 0] : 0
			}}
			transition={{
				duration: 2,
				repeat: value === 'loading' ? Infinity : 0,
				ease: "easeInOut"
			}}
		>
			<Icon className={cn("h-6 w-6", iconColorClass)} />
		</motion.div>
		<div className="flex-1">
			<h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
			<div className="flex items-center gap-2 h-8 overflow-hidden">
				<AnimatePresence mode="wait">
					<motion.div
						key={value}
						initial={{ opacity: 0, y: 20, scale: 0.8 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -20, scale: 0.8 }}
						transition={{ duration: 0.4, ease: "easeOut" }}
						className="flex items-center gap-2"
					>
						{value === 'loading' ? (
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						) : (
							<p className="text-2xl font-bold">{value}</p>
						)}
					</motion.div>
				</AnimatePresence>
			</div>
			{description && (
				<motion.p
					className="text-xs text-muted-foreground mt-0.5"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.1 }}
				>
					{description}
				</motion.p>
			)}
		</div>
	</motion.div>
);

const containerVariants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const QuotaManager = () => {
	// --- State Quản lý dữ liệu (Giữ nguyên logic) ---
	const [statistics, setStatistics] = useState({});
	const [departments, setDepartments] = useState([]);
	const [originalDepartments, setOriginalDepartments] = useState([]);

	// --- State Cấu hình & UI (Giữ nguyên logic) ---
	const [selectedPlan, setSelectedPlan] = useState('');
	const [plans, setPlans] = useState([]);
	const [reusePercentage, setReusePercentage] = useState(20);

	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);

	// [NEW] State cho AlertDialog
	const [isAutoAssignAlertOpen, setIsAutoAssignAlertOpen] = useState(false);

	// --- Effects (Giữ nguyên logic) ---
	useEffect(() => {
		loadPlans();
	}, []);

	useEffect(() => {
		if (selectedPlan) {
			loadData();
		} else {
			setStatistics({});
			setDepartments([]);
			setOriginalDepartments([]);
			setHasChanges(false);
			setReusePercentage(20);
		}
	}, [selectedPlan]);

	useEffect(() => {
		if (departments.length === 0 || originalDepartments.length === 0) {
			setHasChanges(false);
			return;
		}
		const isDifferent = JSON.stringify(departments) !== JSON.stringify(originalDepartments);
		setHasChanges(isDifferent);
	}, [departments, originalDepartments]);

	// --- API Calls (Giữ nguyên logic) ---
	const loadPlans = async () => {
		setIsLoading(true);
		try {
			const response = await axios.get('/admin/thesis-plans/list-all');
			const plansData = response.data || [];
			setPlans(plansData);
			if (plansData.length > 0 && !selectedPlan) {
				setSelectedPlan(String(plansData[0].ID_KEHOACH));
			}
		} catch (error) {
			console.error('Lỗi khi tải danh sách kế hoạch:', error);
			toast.error('Lỗi khi tải danh sách kế hoạch');
		} finally {
			setIsLoading(false);
		}
	};

	const loadData = async () => {
		if (!selectedPlan) return;
		setIsLoading(true);
		try {
			const [statsRes, departmentsRes, planDetailRes] = await Promise.all([
				quotaService.getStatistics({ plan_id: selectedPlan }),
				quotaService.getDepartments({ plan_id: selectedPlan }),
				getThesisPlanById(selectedPlan)
			]);

			setStatistics(statsRes.data);

			setDepartments(departmentsRes.data);
			setOriginalDepartments(JSON.parse(JSON.stringify(departmentsRes.data)));

			setReusePercentage(planDetailRes.TYLE_TAISUDUNG_TOIDA || 0);

			setHasChanges(false);
		} catch (error) {
			toast.error('Lỗi khi tải dữ liệu thống kê');
			console.error(error);
			setStatistics({});
			setDepartments([]);
		} finally {
			setIsLoading(false);
		}
	};

	// --- Logic Handlers (Giữ nguyên logic) ---
	const calculateRatio = (quota, lecturers) => {
		if (lecturers === 0) return 'N/A';
		return (quota / lecturers).toFixed(2);
	};

	const handleLocalChange = (deptId, newValue) => {
		setDepartments(prev =>
			prev.map(dept =>
				dept.ID_KHOA_BOMON === deptId
				? { ...dept, quota_assigned: newValue }
				: dept
			)
		);
	};

	const handleSaveSingleRow = async (deptId, newQuota) => {
		setIsSubmitting(true);
		try {
			await quotaService.assignDepartmentQuota({
				ID_KEHOACH: selectedPlan,
				ID_KHOA_BOMON: deptId,
				SO_DETAI_QUOTA: newQuota,
				GHICHU: 'Cập nhật nhanh'
			});

			toast.success('Đã lưu quota cho bộ môn này.');

			setOriginalDepartments(prev =>
				prev.map(dept =>
					dept.ID_KHOA_BOMON === deptId
					? { ...dept, quota_assigned: newQuota }
					: dept
				)
			);

			const statsRes = await quotaService.getStatistics({ plan_id: selectedPlan });
			setStatistics(statsRes.data);

		} catch (error) {
			toast.error(error.response?.data?.message || 'Lỗi khi lưu quota');
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleSaveAll = async () => {
		setIsSubmitting(true);
		try {
			const changedDepts = departments.filter((dept, index) => {
				return dept.quota_assigned !== originalDepartments[index].quota_assigned;
			});

			if (changedDepts.length === 0) {
				toast.info("Không có thay đổi nào để lưu.");
				return;
			}

			const promises = changedDepts.map(dept =>
				quotaService.assignDepartmentQuota({
					ID_KEHOACH: selectedPlan,
					ID_KHOA_BOMON: dept.ID_KHOA_BOMON,
					SO_DETAI_QUOTA: dept.quota_assigned,
					GHICHU: 'Cập nhật hàng loạt'
				})
			);

			await Promise.all(promises);
			toast.success(`Đã cập nhật thành công ${changedDepts.length} bộ môn.`);
			loadData();

		} catch (error) {
			console.error("Lỗi lưu hàng loạt:", error);
			toast.error("Có lỗi xảy ra khi lưu dữ liệu.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleResetChanges = () => {
		setDepartments(JSON.parse(JSON.stringify(originalDepartments)));
		setHasChanges(false);
		toast.info("Đã hủy các thay đổi chưa lưu.");
	};

	const handleAutoAssignQuotas = async () => {
		if (!selectedPlan) {
			toast.error('Vui lòng chọn kế hoạch');
			return;
		}
		setIsAutoAssignAlertOpen(true);
	};

	// [NEW] Logic thực hiện sau khi xác nhận AlertDialog
	const confirmAutoAssign = async () => {
		setIsSubmitting(true);
		setIsAutoAssignAlertOpen(false); // Đóng alert
		try {
			await quotaService.autoAssignQuotas({
				ID_KEHOACH: selectedPlan
			});
			toast.success('Tự động phân công đề tài thành công');
			loadData();
		} catch (error) {
			toast.error(error.response?.data?.message || 'Lỗi khi tự động phân công đề tài');
		} finally {
			setIsSubmitting(false);
		}
	}

	const handleUpdateReusePercentage = async () => {
		if (!selectedPlan) return;

		const value = parseInt(reusePercentage);
		if (isNaN(value) || value < 0 || value > 100) {
			toast.error("Tỷ lệ phải từ 0 đến 100%");
			return;
		}

		setIsSubmitting(true);
		try {
			await quotaService.updateReusePercentage({
				ID_KEHOACH: selectedPlan,
				TYLE_TAISUDUNG_TOIDA: value
			});
			toast.success("Cập nhật tỷ lệ tái sử dụng thành công!");
		} catch (error) {
			toast.error(error.response?.data?.message || "Lỗi khi cập nhật tỷ lệ");
		} finally {
			setIsSubmitting(false);
		}
	};

	const getQuotaStatus = (quota, actual) => {
		if (quota === 0) return <Badge variant="outline">Chưa phân công</Badge>;
		if (actual >= quota) return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-700">Đủ</Badge>;
		return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700">Còn {quota - actual}</Badge>;
	};

	const renderContent = () => {
		if (isLoading && !isSubmitting) {
			return (
				<div className="flex flex-col items-center justify-center h-64 text-blue-500">
					<Loader2 className="h-8 w-8 animate-spin mb-4" />
					<p>Đang tải dữ liệu kế hoạch...</p>
				</div>
			);
		}

		if (!selectedPlan) {
			return (
				<div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-card rounded-lg p-6 border-2 border-dashed">
					<BookOpen className="h-8 w-8 mb-4 text-orange-500" />
					<p className="text-lg font-semibold">Vui lòng chọn một Kế hoạch Khóa luận</p>
					{plans.length === 0 && <p className="text-sm mt-2">Hiện tại không có Kế hoạch nào.</p>}
				</div>
			);
		}

		const totalRequired = statistics.overview?.required_topics || 0;
		const totalAssigned = departments.reduce((sum, dept) => sum + (dept.quota_assigned || 0), 0);
		const isLoadingData = isLoading || isSubmitting;

		return (
			<motion.div
				className="space-y-6"
				key={selectedPlan}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.5 }}
			>
				{/* 1. CÁC THẺ THỐNG KÊ */}
				<motion.div
					className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
					variants={containerVariants}
					initial="hidden"
					animate="visible"
				>
					<StatCard
						icon={Users}
						title="Tổng sinh viên"
						value={isLoadingData ? 'loading' : statistics.overview?.total_students || 0}
						description="Trong kế hoạch"
						iconBgClass="bg-blue-100 dark:bg-blue-900/30"
						iconColorClass="text-blue-600 dark:text-blue-400"
					/>
					<StatCard
						icon={Layers}
						title="Số nhóm dự kiến"
						value={isLoadingData ? 'loading' : statistics.overview?.expected_groups || 0}
						description="Dựa trên tổng sinh viên"
						iconBgClass="bg-indigo-100 dark:bg-indigo-900/30"
						iconColorClass="text-indigo-600 dark:text-indigo-400"
					/>
					<StatCard
						icon={BookOpen}
						title="Đề tài cần ra (Target)"
						value={isLoadingData ? 'loading' : totalRequired}
						description="1.5x số nhóm dự kiến"
						iconBgClass="bg-green-100 dark:bg-green-900/30"
						iconColorClass="text-green-600 dark:text-green-400"
					/>
					<StatCard
						icon={AlertTriangle}
						title="Tổng quota đã phân công"
						value={isLoadingData ? 'loading' : totalAssigned}
						description="Tổng số quota đã giao"
						iconBgClass="bg-yellow-100 dark:bg-yellow-900/30"
						iconColorClass="text-yellow-600 dark:text-yellow-400"
					/>
				</motion.div>

				{/* 2. KHỐI CẤU HÌNH & TỰ ĐỘNG */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Card Trái: Cấu hình Tái sử dụng */}
					<Card className="border-l-4 border-l-blue-500 shadow-sm">
						<CardHeader className="pb-3">
							<CardTitle className="text-lg flex items-center gap-2">
								<RotateCw className="w-5 h-5 text-blue-500" />
								Cấu hình Tái sử dụng Đề tài
							</CardTitle>
							<CardDescription>
								Giới hạn % số lượng đề tài giảng viên được phép lấy lại từ các năm cũ.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex items-center gap-4">
								<div className="relative flex-1">
									<Input
										type="number"
										min="0"
										max="100"
										value={reusePercentage}
										onChange={(e) => setReusePercentage(e.target.value)}
										className="pr-8 font-bold text-lg"
										placeholder="VD: 20"
									/>
									<span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
								</div>
								<Button
									onClick={handleUpdateReusePercentage}
									disabled={isLoadingData}
									className="min-w-[100px] bg-blue-600 hover:bg-blue-700"
								>
									{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
									Lưu
								</Button>
							</div>
							<p className="text-xs text-muted-foreground mt-2 italic bg-muted/30 p-2 rounded border border-dashed">
								<Info className="w-3 h-3 inline mr-1 translate-y-[-1px]"/>
								Ví dụ: Nếu giảng viên được giao 5 đề tài và tỷ lệ là 20%, họ được phép tái sử dụng tối đa 1 đề tài.
							</p>
						</CardContent>
					</Card>

					{/* Card Phải: Tự động phân công */}
					<Card className="border-l-4 border-l-orange-500 shadow-sm">
						<CardHeader className="pb-3">
							<CardTitle className="text-lg flex items-center gap-2">
								<Layers className="w-5 h-5 text-orange-500" />
								Tự động Phân công Quota
							</CardTitle>
							<CardDescription>
								Phân bổ <span className="font-bold text-primary">{totalRequired}</span> đề tài (target) đều cho các Khoa/Bộ môn.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex flex-col gap-3">
								<div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-md text-xs text-orange-800 dark:text-orange-300 flex gap-2 border border-orange-100 dark:border-orange-800">
									<AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
									<span>Lưu ý: Thao tác này sẽ **ghi đè toàn bộ** quota thủ công hiện tại của các Khoa/Bộ môn trong bảng bên dưới.</span>
								</div>
								<Button
									onClick={handleAutoAssignQuotas}
									disabled={!selectedPlan || isLoadingData || totalRequired === 0}
									variant="outline"
									className="w-full text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-800 dark:hover:bg-orange-900/20"
								>
									{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Thực hiện Phân công Tự động"}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* 3. BẢNG CHI TIẾT */}
				<Card className="flex-1 flex flex-col min-h-0">
					<CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 shrink-0">
						<div>
							<CardTitle className="text-xl font-bold">Bảng Chi tiết Quota Bộ môn</CardTitle>
							<CardDescription>
								Điều chỉnh số lượng và nhấn **Enter** để lưu từng dòng, hoặc nhấn **Lưu thay đổi** để lưu tất cả.
							</CardDescription>
						</div>

						<div className="flex items-center gap-3">
							{/* Tổng số lượng */}
							<div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md border border-border/50 shadow-sm">
								<span className="text-sm font-medium text-muted-foreground">Tổng cộng:</span>
								<span className={cn(
									"text-lg font-bold",
									totalAssigned > totalRequired ? "text-orange-600" : "text-primary"
								)}>
									{totalAssigned}
								</span>
								<span className="text-xs text-muted-foreground">/ {totalRequired} target</span>
							</div>

							{hasChanges && (
								<Button
									variant="ghost"
									size="sm"
									onClick={handleResetChanges}
									disabled={isSubmitting}
									className="text-muted-foreground hover:text-foreground"
								>
									<RotateCcw className="h-4 w-4 mr-2" /> Hủy
								</Button>
							)}

							<Button
								onClick={handleSaveAll}
								disabled={!hasChanges || isSubmitting}
								className={cn("transition-all", hasChanges ? "animate-pulse shadow-lg" : "opacity-50")}
							>
								{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
								Lưu thay đổi
							</Button>
						</div>
					</CardHeader>
					<CardContent className="p-0 flex-1 overflow-y-auto">
						{departments.length === 0 ? (
							<div className="py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
								Không có dữ liệu Khoa/Bộ môn nào.
							</div>
						) : (
							<div className="rounded-md">
								<Table>
									<TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
									<TableRow className="bg-muted/50 hover:bg-muted/50">
										<TableHead className="w-[30%]">Khoa/Bộ môn</TableHead>
										<TableHead className="text-center">Số GV</TableHead>
										<TableHead className="text-center font-bold text-primary">Được Giao (Quota)</TableHead>
										<TableHead className="text-center">Tỷ lệ (Đề tài/GV)</TableHead>
										<TableHead className="text-center">Thực tế Đã tạo</TableHead>
										<TableHead className="text-center">Trạng Thái</TableHead>
									</TableRow>
									</TableHeader>
									<TableBody>
									{departments.map(dept => (
										<TableRow key={dept.ID_KHOA_BOMON} className={cn(
											"hover:bg-muted/5",
											departments.findIndex(o => o.ID_KHOA_BOMON === dept.ID_KHOA_BOMON) !== originalDepartments.findIndex(o => o.ID_KHOA_BOMON === dept.ID_KHOA_BOMON) || dept.quota_assigned !== originalDepartments.find(o => o.ID_KHOA_BOMON === dept.ID_KHOA_BOMON)?.quota_assigned ? 'bg-yellow-50/50 dark:bg-yellow-900/20' : ''
										)}>
										<TableCell className="font-semibold">{dept.TEN_KHOA_BOMON}</TableCell>
										<TableCell className="text-center">{dept.total_lecturers || 0}</TableCell>
										<TableCell className="text-center">
											<div className="flex items-center justify-center gap-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleLocalChange(dept.ID_KHOA_BOMON, Math.max(0, (dept.quota_assigned || 0) - 1))}
												disabled={isLoadingData}
												className="h-7 w-7 p-0 rounded-full"
											>
												<Minus className="h-3 w-3" />
											</Button>

											<input
												type="number"
												value={dept.quota_assigned || 0}
												onChange={(e) => {
												const val = parseInt(e.target.value, 10);
												handleLocalChange(dept.ID_KHOA_BOMON, isNaN(val) ? 0 : val);
												}}
												onKeyDown={(e) => {
												if (e.key === 'Enter') {
													const val = parseInt(e.target.value, 10) || 0;
													handleSaveSingleRow(dept.ID_KHOA_BOMON, val);
													e.target.blur();
												}
												}}
												disabled={isLoadingData}
												className="w-16 text-center font-bold text-primary border rounded-md h-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
												min={0}
											/>

											<Button
												variant="outline"
												size="sm"
												onClick={() => handleLocalChange(dept.ID_KHOA_BOMON, (dept.quota_assigned || 0) + 1)}
												disabled={isLoadingData}
												className="h-7 w-7 p-0 rounded-full"
											>
												<Plus className="h-3 w-3" />
											</Button>
											</div>
										</TableCell>
										<TableCell className="text-center font-medium text-muted-foreground">
											{calculateRatio(dept.quota_assigned || 0, dept.total_lecturers || 0)}
										</TableCell>
										<TableCell className="text-center font-mono">
											{dept.actual_created || 0}
										</TableCell>
										<TableCell className="text-center">
											{getQuotaStatus(dept.quota_assigned || 0, dept.actual_created || 0)}
										</TableCell>
										</TableRow>
									))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>
			</motion.div>
		);
	};

	return (
		<motion.div
			className="h-full flex flex-col space-y-4 p-4 md:p-6 overflow-hidden max-w-[1600px] mx-auto"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}
		>
			{/* Plan Selector - Pinned/Fixed */}
			<div className="shrink-0 flex items-center gap-3 bg-card p-3 rounded-lg border shadow-sm">
				<label className="text-sm font-medium whitespace-nowrap text-muted-foreground px-2">Đợt khóa luận:</label>
				<Select
					value={selectedPlan ? String(selectedPlan) : ""}
					onValueChange={setSelectedPlan}
					disabled={isLoading}
				>
					<SelectTrigger className="w-full md:w-[300px] bg-background font-medium">
						<SelectValue placeholder="Chọn kế hoạch..." />
					</SelectTrigger>
					<SelectContent>
						{isLoading ? (
							<div className="flex items-center justify-center p-2">
								<Loader2 className="h-4 w-4 animate-spin" />
							</div>
						) : plans.length === 0 ? (
							<div className="p-2 text-center text-sm text-muted-foreground">Không có kế hoạch</div>
						) : (
							plans.map(plan => (
								<SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
									{plan.TEN_DOT} ({plan.NAMHOC})
								</SelectItem>
							))
						)}
					</SelectContent>
				</Select>
			</div>
			{/* Scrollable Content */}
			<div className="flex-1 overflow-y-auto">
				{renderContent()}
			</div>

			{/* AlertDialog cho Tự động phân công */}
			<AlertDialog open={isAutoAssignAlertOpen} onOpenChange={setIsAutoAssignAlertOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="text-orange-600 flex items-center gap-2">
							<AlertTriangle className="h-5 w-5" /> Xác nhận Tự động Phân công?
						</AlertDialogTitle>
						<AlertDialogDescription>
							Thao tác này sẽ **ghi đè toàn bộ Quota** đã phân công thủ công hiện tại cho các Khoa/Bộ môn.
							<br/><br/>
							Bạn có chắc chắn muốn tiếp tục và phân công Quota dựa trên tính toán tự động không?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isSubmitting}>Hủy</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmAutoAssign}
							disabled={isSubmitting}
							className="bg-orange-600 hover:bg-orange-700"
						>
							{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Xác nhận Ghi đè"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</motion.div>
	);
};

export default QuotaManager;