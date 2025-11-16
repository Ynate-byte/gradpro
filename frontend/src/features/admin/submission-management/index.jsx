import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { getSubmissions } from '@/api/adminSubmissionService';
import { getAllPlans } from '@/api/thesisPlanService';
import { DataTable } from '@/components/shared/data-table/DataTable';
import { getColumns } from './components/columns';
import { AnimatePresence } from 'framer-motion';
import { SubmissionDetailSheet } from './components/SubmissionDetailSheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookCopy, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusConfig = {
  'Bản nháp': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  'Chờ phê duyệt': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Chờ duyệt chỉnh sửa': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Yêu cầu chỉnh sửa': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  'Đã phê duyệt': 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  'Đang thực hiện': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'Đang chấm điểm': 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  'Đã hoàn thành': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'Đã hủy': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
};

export default function SubmissionManagementPage() {
  const [submissions, setSubmissions] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([]);
  const [allPlans, setAllPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('all');
  const [columnFilters, setColumnFilters] = useState([]);
  const [activeTab, setActiveTab] = useState('Chờ xác nhận');

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState(null);

  useEffect(() => {
    getAllPlans()
      .then(data => setAllPlans(data || []))
      .catch(() => toast.error("Không thể tải danh sách kế hoạch."));
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = {
      page: pagination.pageIndex + 1,
      per_page: pagination.pageSize,
      sort: sorting[0] ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : 'NGAY_NOP,asc',
      plan_id: selectedPlanId === 'all' ? undefined : selectedPlanId,
      trangthai: activeTab === 'Tất cả' ? undefined : activeTab,
    };

    getSubmissions(params)
      .then(response => {
        setSubmissions(response.data);
        setPageCount(response.last_page);
      })
      .catch(() => toast.error("Lỗi khi tải danh sách phiếu nộp."))
      .finally(() => setLoading(false));
  }, [pagination, sorting, selectedPlanId, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [selectedPlanId, activeTab]);

  const handleSuccess = () => {
    fetchData();
  };

  const handleViewDetails = (submission) => {
    setViewingSubmission(submission);
    setIsSheetOpen(true);
  };

  const columns = useMemo(() => getColumns({
    onViewDetails: handleViewDetails,
    onSuccess: handleSuccess,
  }), [handleSuccess]);

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <CheckCircle className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Duyệt Nộp Sản Phẩm</h1>
          <p className="text-muted-foreground">Xác nhận các sản phẩm khóa luận do sinh viên nộp.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử Nộp Sản Phẩm</CardTitle>
          <CardDescription>
            Lọc và xem lại tất cả các bài nộp của sinh viên.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <TabsList>
                <TabsTrigger value="Chờ xác nhận">Chờ xác nhận</TabsTrigger>
                <TabsTrigger value="Đã xác nhận">Đã xác nhận</TabsTrigger>
                <TabsTrigger value="Yêu cầu nộp lại">Yêu cầu nộp lại</TabsTrigger>
                <TabsTrigger value="Tất cả">Tất cả</TabsTrigger>
              </TabsList>

              <div className="max-w-sm">
                <Select onValueChange={setSelectedPlanId} value={selectedPlanId || 'all'}>
                  <SelectTrigger>
                    <div className='flex items-center gap-2'>
                      <BookCopy className='h-4 w-4 text-muted-foreground' />
                      <SelectValue placeholder="Lọc theo kế hoạch..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả kế hoạch</SelectItem>
                    {allPlans.map(plan => {
                      const config = statusConfig[plan.TRANGTHAI] || 'bg-gray-100 text-gray-800';
                      return (
                        <SelectItem key={plan.ID_KEHOACH} value={String(plan.ID_KEHOACH)}>
                          <div className="flex items-center justify-between w-full">
                            <span>{plan.TEN_DOT}</span>
                            <Badge variant="outline" className={cn('border-0 text-xs ml-4', config)}>
                              {plan.TRANGTHAI}
                            </Badge>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value={activeTab} className="mt-0 outline-none ring-0">
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
                onAddUser={null}
                addBtnText=""
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AnimatePresence>
        {isSheetOpen && viewingSubmission && (
          <SubmissionDetailSheet
            submission={viewingSubmission}
            isOpen={isSheetOpen}
            setIsOpen={setIsSheetOpen}
            onSuccess={handleSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
