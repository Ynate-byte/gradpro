import React, { useState, useEffect, useCallback } from 'react';
import { getMyActivePlans } from '@/api/groupService';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton'; // Thêm Skeleton
import { Loader2, Calendar, Clock, BookCopy, Users, ChevronRight, ChevronDown, CheckCircle } from 'lucide-react'; // Bỏ Radio
import { format, parseISO, isValid, isPast, isFuture } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from '@/components/ui/separator';

// Component con hiển thị thông tin (Không đổi)
const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center text-sm text-muted-foreground">
    <Icon className="h-4 w-4 mr-2 shrink-0" />
    <span className="font-medium">{label}:</span>
    <span className="ml-2">{value}</span>
  </div>
);

// Định dạng ngày (Không đổi)
const formatNullableDate = (dateString, formatString = 'dd/MM/yyyy HH:mm') => {
  if (!dateString) return 'N/A';
  try {
    const date = parseISO(dateString);
    if (isValid(date)) {
      return format(date, formatString, { locale: vi });
    }
  } catch (e) { /* ignore */ }
  return 'N/A';
};

// Cấu hình màu badge trạng thái (Không đổi)
const statusConfig = {
  'Đang thực hiện': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'Đang chấm điểm': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
};

// Component con hiển thị Mốc thời gian (Nâng cấp UI)
const MilestoneItem = ({ moc, isLast }) => {
  const startDate = parseISO(moc.NGAY_BATDAU);
  const endDate = parseISO(moc.NGAY_KETTHUC);

  const isCompleted = isPast(endDate);
  const isOngoing = !isCompleted && !isFuture(startDate);

  // Nâng cấp logic biểu tượng
  let StatusIcon = Calendar; // Mặc định là Lịch (sắp tới)
  let iconBg = "bg-gray-100 dark:bg-gray-700";
  let iconColor = "text-gray-600 dark:text-gray-300";

  if (isCompleted) {
    StatusIcon = CheckCircle;
    iconBg = "bg-green-100 dark:bg-green-800/30";
    iconColor = "text-green-600 dark:text-green-400";
  } else if (isOngoing) {
    StatusIcon = Loader2;
    iconBg = "bg-blue-100 dark:bg-blue-800/30";
    iconColor = "text-blue-600 dark:text-blue-400 animate-spin";
  }

  return (
    // Nâng cấp giao diện timeline
    <div className="relative flex pb-10">
      {!isLast && <div className="absolute left-4 top-2 w-px h-[calc(100%+0.5rem)] bg-gray-200 dark:bg-gray-700" />}
      <div className="relative z-10 flex-shrink-0">
        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", iconBg)}>
          <StatusIcon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
      <div className="pl-4">
        <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">{moc.TEN_SUKIEN}</p>
        <p className="text-xs text-muted-foreground">
          {formatNullableDate(moc.NGAY_BATDAU)} - {formatNullableDate(moc.NGAY_KETTHUC)}
        </p>
        {moc.MOTA && <p className="text-sm mt-1 text-gray-600 dark:text-gray-400 italic">"{moc.MOTA}"</p>}
      </div>
    </div>
  );
};

// Component thẻ Kế hoạch (Nâng cấp UI)
const PlanCard = ({ plan }) => {
  const [isMilestonesOpen, setIsMilestonesOpen] = useState(false);
  const status = plan.TRANGTHAI;
  const config = statusConfig[status] || 'bg-gray-100 text-gray-800';
  const milestones = plan.moc_thoigians || [];

  // Nâng cấp: Thêm viền màu theo trạng thái
  const borderColor = status === 'Đang thực hiện'
    ? "border-l-4 border-blue-500"
    : "border-l-4 border-yellow-500";

  return (
    <Collapsible open={isMilestonesOpen} onOpenChange={setIsMilestonesOpen} asChild>
      <Card className={cn("transition-all hover:shadow-lg", borderColor)}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-xl mb-1.5 font-bold text-gray-900 dark:text-gray-50">{plan.TEN_DOT}</CardTitle>
              <Badge variant="outline" className={cn('text-xs', config)}>
                {status}
              </Badge>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link to="/projects/my-group">
                Xem nhóm <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            <InfoItem icon={Calendar} label="Năm học" value={`${plan.NAMHOC} - HK ${plan.HOCKY}`} />
            <InfoItem icon={Users} label="Khóa" value={plan.KHOAHOC} />
            <InfoItem icon={Clock} label="Bắt đầu" value={formatNullableDate(plan.NGAY_BATDAU, 'dd/MM/yyyy')} />
            <InfoItem icon={Clock} label="Kết thúc" value={formatNullableDate(plan.NGAY_KETHUC, 'dd/MM/yyyy')} />
          </div>
          <Separator />
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-start px-0 text-primary hover:text-primary/90">
              <ChevronDown className={cn("h-4 w-4 mr-2 transition-transform", isMilestonesOpen && "-rotate-180")} />
              {isMilestonesOpen ? 'Ẩn' : 'Xem'} chi tiết các mốc thời gian ({milestones.length})
            </Button>
          </CollapsibleTrigger>
        </CardContent>

        <CollapsibleContent asChild>
          <CardFooter className="pt-0">
            {/* Nâng cấp: Thêm padding và nền cho vùng timeline */}
            <div className="pl-4 pt-4 mt-2 w-full bg-gray-50 dark:bg-gray-800/30 rounded-lg">
              {milestones.length > 0 ? (
                milestones.map((moc, index) => (
                  <MilestoneItem
                    key={moc.ID}
                    moc={moc}
                    isLast={index === milestones.length - 1}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground pb-4">Kế hoạch này chưa có mốc thời gian chi tiết.</p>
              )}
            </div>
          </CardFooter>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

// (MỚI) Component hiển thị khung xương tải dữ liệu
const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[...Array(2)].map((_, i) => (
      <Card key={i}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Skeleton className="h-7 w-72 mb-2" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-9 w-28" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-5 w-44" />
          </div>
          <Separator />
          <Skeleton className="h-9 w-52" />
        </CardContent>
      </Card>
    ))}
  </div>
);

// (MỚI) Component hiển thị trạng thái rỗng
const EmptyState = () => (
  <Card className="border-dashed">
    <CardContent className="p-10 text-center flex flex-col items-center">
      <div className="h-16 w-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <BookCopy className="h-8 w-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Không tìm thấy kế hoạch</h3>
      <p className="text-muted-foreground">Bạn hiện không tham gia vào bất kỳ đợt khóa luận nào đang hoạt động.</p>
    </CardContent>
  </Card>
);


// Component trang chính (Nâng cấp)
export default function MyPlansPage() {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Logic fetch (Không đổi)
  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getMyActivePlans();
      setPlans(data || []);
    } catch (error) {
      console.error("Failed to fetch plans:", error);
      toast.error("Không thể tải danh sách kế hoạch của bạn.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <BookCopy className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Kế hoạch Khóa luận</h1>
          <p className="text-muted-foreground">Danh sách các đợt khóa luận bạn đang tham gia.</p>
        </div>
      </div>

      {/* Nâng cấp logic render */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : plans.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {plans.map(plan => (
            <PlanCard key={plan.ID_KEHOACH} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
}
