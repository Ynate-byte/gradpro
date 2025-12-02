import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { getSubmissions, getSubmissionStatistics } from '@/api/adminSubmissionService';
import { getAllPlans } from '@/api/thesisPlanService';
import { DataTable } from '@/components/shared/data-table/DataTable';
import { getColumns } from './components/columns';
import { SubmissionDetailDialog } from './components/SubmissionDetailDialog'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookCopy, CheckCircle, Clock, AlertCircle, FileCheck, FileWarning, Search, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import StatCard from '@/components/shared/StatCard';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';

const planStatusColors = {
    'Bản nháp': 'bg-gray-100 text-gray-600',
    'Chờ phê duyệt': 'bg-yellow-100 text-yellow-700',
    'Chờ duyệt chỉnh sửa': 'bg-yellow-100 text-yellow-700',
    'Yêu cầu chỉnh sửa': 'bg-orange-100 text-orange-700',
    'Đã phê duyệt': 'bg-sky-100 text-sky-700',
    'Đang thực hiện': 'bg-blue-100 text-blue-700',
    'Đang chấm điểm': 'bg-purple-100 text-purple-700',
    'Đã hoàn thành': 'bg-green-100 text-green-700',
    'Đã hủy': 'bg-red-100 text-red-700',
};

export default function SubmissionManagementPage() {
  const { user } = useAuth();

  // --- State Quản lý dữ liệu ---
  const [submissions, setSubmissions] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // --- State Bộ lọc & Phân trang ---
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState([]);
  const [allPlans, setAllPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('all');
  const [activeTab, setActiveTab] = useState('Chờ xác nhận'); // Mặc định tab này
  const [columnFilters, setColumnFilters] = useState([]);
  
  // --- State Tìm kiếm ---
  const [searchTerm, setSearchTerm] = useState(''); 
  const debouncedSearch = useDebounce(searchTerm, 500);

  // --- State Dialog Chi tiết ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState(null);

  // --- State Thống kê ---
  const [stats, setStats] = useState({
      pending: 0,
      approved: 0,
      rejected: 0,
      not_submitted: 0 
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // --- 1. Tính toán index của bài đang xem ---
  const viewingIndex = useMemo(() => {
    if (!viewingSubmission || submissions.length === 0) return -1;
    return submissions.findIndex(s => s.ID_NOP_SANPHAM === viewingSubmission.ID_NOP_SANPHAM);
  }, [submissions, viewingSubmission]);

  // --- 2. Load danh sách kế hoạch ---
  useEffect(() => {
    getAllPlans()
      .then(data => setAllPlans(data || []))
      .catch(() => toast.error("Không thể tải danh sách kế hoạch."));
  }, []);

  // --- 3. Load thống kê ---
  const fetchStats = useCallback(() => {
    setLoadingStats(true);
    getSubmissionStatistics(selectedPlanId)
        .then(data => setStats(data))
        .catch(err => console.error("Lỗi tải thống kê:", err))
        .finally(() => setLoadingStats(false));
  }, [selectedPlanId]);

  useEffect(() => {
      fetchStats();
  }, [fetchStats]);

  // --- 4. Load danh sách bài nộp ---
  const fetchData = useCallback(() => {
    setLoading(true);
    
    const isLecturerRoute = window.location.pathname.includes('/lecturer');

    const params = {
      page: pagination.pageIndex + 1,
      per_page: pagination.pageSize,
      sort: sorting[0] ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : 'NGAY_NOP,asc',
      plan_id: selectedPlanId === 'all' ? undefined : selectedPlanId,
      trangthai: activeTab === 'Tất cả' ? undefined : activeTab, // Filter theo Tab hiện tại
      search: debouncedSearch,
      lecturer_id: (isLecturerRoute && user?.giangvien) ? user.giangvien.ID_GIANGVIEN : undefined
    };

    getSubmissions(params)
      .then(response => {
        setSubmissions(response.data);
        setPageCount(response.last_page);
      })
      .catch(() => toast.error("Lỗi khi tải danh sách phiếu nộp."))
      .finally(() => setLoading(false));
  }, [pagination, sorting, selectedPlanId, activeTab, debouncedSearch, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset trang về 1 khi thay đổi filter
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [selectedPlanId, activeTab, debouncedSearch]);

  // --- 5. Handlers ---
  const handleSuccess = () => {
    fetchData(); 
    fetchStats();
  };

  const handleViewDetails = (submission) => {
    setViewingSubmission(submission);
    setIsDialogOpen(true);
  };

  const handleNext = () => {
    if (viewingIndex < submissions.length - 1) {
      setViewingSubmission(submissions[viewingIndex + 1]);
    } else {
      toast.info("Đã là bài cuối cùng trong trang danh sách này.");
    }
  };

  const handlePrevious = () => {
    if (viewingIndex > 0) {
      setViewingSubmission(submissions[viewingIndex - 1]);
    } else {
      toast.info("Đã là bài đầu tiên trong trang danh sách này.");
    }
  };

  const columns = useMemo(() => getColumns({
    onViewDetails: handleViewDetails,
    onSuccess: handleSuccess,
  }), [handleSuccess]);

  // [STYLE] Class nhỏ gọn cho StatCard
  const compactStatCardClass = "p-2 shadow-sm border bg-card hover:bg-accent/5 transition-colors cursor-pointer"; 

  return (
    // [LAYOUT] Container chính
    <div className="h-full flex flex-col p-4 md:p-6 gap-4 bg-muted/10 overflow-hidden animate-in fade-in duration-500">
      
      {/* 1. Stats Area (Click vào thẻ để chuyển Tab) */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 shrink-0">
            <StatCard
                title="Chờ xác nhận"
                value={stats.pending}
                icon={Clock}
                description="Cần xử lý ngay"
                iconBgClass="bg-yellow-100 dark:bg-yellow-900/20"
                iconColorClass="text-yellow-600 dark:text-yellow-400"
                isLoading={loadingStats}
                onClick={() => setActiveTab('Chờ xác nhận')}
                isActive={activeTab === 'Chờ xác nhận'}
                className={compactStatCardClass} 
            />
             <StatCard
                title="Đã duyệt"
                value={stats.approved}
                icon={FileCheck}
                description="Hợp lệ"
                iconBgClass="bg-green-100 dark:bg-green-900/20"
                iconColorClass="text-green-600 dark:text-green-400"
                isLoading={loadingStats}
                onClick={() => setActiveTab('Đã xác nhận')}
                isActive={activeTab === 'Đã xác nhận'}
                className={compactStatCardClass}
            />
             <StatCard
                title="Yêu cầu nộp lại"
                value={stats.rejected}
                icon={AlertCircle}
                description="Chưa đạt yêu cầu"
                iconBgClass="bg-red-100 dark:bg-red-900/20"
                iconColorClass="text-red-600 dark:text-red-400"
                isLoading={loadingStats}
                onClick={() => setActiveTab('Yêu cầu nộp lại')}
                isActive={activeTab === 'Yêu cầu nộp lại'}
                className={compactStatCardClass}
            />
            <StatCard
                title="Chưa nộp"
                value={stats.not_submitted}
                icon={FileWarning}
                description="Đang chờ nộp"
                iconBgClass="bg-gray-100 dark:bg-gray-800"
                iconColorClass="text-gray-600 dark:text-gray-400"
                isLoading={loadingStats}
                // onClick={() => setActiveTab('Tất cả')} // Có thể map sang filter khác nếu muốn
                className={compactStatCardClass}
            />
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col bg-background rounded-xl border shadow-sm overflow-hidden">
        
        {/* Tabs & Toolbar */}
        <div className="border-b bg-background p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
            {/* Tabs Control */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
                <TabsList className="grid w-full lg:w-auto grid-cols-4 h-9">
                    {['Chờ xác nhận', 'Đã xác nhận', 'Yêu cầu nộp lại', 'Tất cả'].map((tab) => (
                        <TabsTrigger 
                            key={tab} 
                            value={tab}
                            className="text-xs px-2 lg:px-4 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                        >
                            {tab}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {/* Filter Tools (Search & Select Plan) */}
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
                <div className="relative w-full sm:w-60">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                        placeholder="Tìm theo đề tài, nhóm..." 
                        className="pl-8 h-9 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <Select onValueChange={setSelectedPlanId} value={selectedPlanId || 'all'}>
                    <SelectTrigger className="w-full sm:w-[250px] h-9 text-sm">
                        <div className='flex items-center gap-2 truncate'>
                            <BookCopy className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                            <SelectValue placeholder="Tất cả kế hoạch" />
                        </div>
                    </SelectTrigger>
                    <SelectContent align="end" className="max-w-[300px]">
                        <SelectItem value="all">
                            <span className="font-medium">Tất cả kế hoạch</span>
                        </SelectItem>
                        {allPlans.map(plan => (
                            <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                                <div className="flex flex-col gap-0.5 text-left">
                                    <span className="font-medium truncate w-full">{plan.TEN_DOT}</span>
                                    <span className={cn("text-[10px] uppercase font-bold", 
                                        planStatusColors[plan.TRANGTHAI]?.split(' ')[1] 
                                    )}>
                                        {plan.TRANGTHAI}
                                    </span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => fetchData()}>
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
            </div>
        </div>

        {/* 3. Table Container */}
        {/* Quan trọng: flex-1 overflow-y-auto để cuộn riêng phần bảng */}
        <div className="flex-1 overflow-y-auto min-h-0 relative">
            <DataTable
                columns={columns}
                data={submissions}
                pageCount={pageCount}
                loading={loading}
                pagination={pagination}
                setPagination={setPagination}
                sorting={sorting}
                setSorting={setSorting}
                columnFilters={columnFilters}
                setColumnFilters={setColumnFilters}
                
                // Tắt border của container con vì đã có border ở container cha
                containerClassName="border-0 rounded-none h-full"
                className="h-full"
                flexLayout={true} // Chế độ flex cho bảng
            />
        </div>
      </div>

      {viewingSubmission && (
        <SubmissionDetailDialog
          submission={viewingSubmission}
          isOpen={isDialogOpen}
          setIsOpen={setIsDialogOpen}
          onSuccess={handleSuccess}
          onNext={handleNext}
          onPrevious={handlePrevious}
          hasNext={viewingIndex < submissions.length - 1}
          hasPrevious={viewingIndex > 0}
        />
      )}
    </div>
  );
}