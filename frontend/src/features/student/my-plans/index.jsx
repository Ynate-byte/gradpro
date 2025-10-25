import React, { useState, useEffect, useCallback } from 'react';
import { getMyActivePlans } from '@/api/groupService';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Clock, BookCopy, Users, ChevronRight, ChevronDown, CheckCircle, Radio } from 'lucide-react';
import { format, parseISO, isValid, isPast, isFuture } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from '@/components/ui/separator';

// Component con hiển thị thông tin
const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center text-sm text-muted-foreground">
    <Icon className="h-4 w-4 mr-2 shrink-0" />
    <span className="font-medium">{label}:</span>
    <span className="ml-2">{value}</span>
  </div>
);

// Định dạng ngày
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

// Cấu hình màu badge trạng thái
const statusConfig = {
  'Đang thực hiện': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'Đang chấm điểm': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
};

// Component con hiển thị Mốc thời gian
const MilestoneItem = ({ moc, isLast }) => {
  const startDate = parseISO(moc.NGAY_BATDAU);
  const endDate = parseISO(moc.NGAY_KETTHUC);

  const isCompleted = isPast(endDate);
  const isOngoing = !isCompleted && !isFuture(startDate);

  let StatusIcon = Radio;
  let statusColor = "text-muted-foreground";

  if (isCompleted) {
    StatusIcon = CheckCircle;
    statusColor = "text-green-500";
  } else if (isOngoing) {
    StatusIcon = Loader2;
    statusColor = "text-blue-500 animate-spin";
  }

  return (
    <div className="relative flex pb-8">
      {!isLast && <div className="absolute left-3 top-1 w-px h-full bg-border" />}
      <div className="relative z-10">
        <StatusIcon className={cn("h-6 w-6 p-0.5", statusColor)} />
      </div>
      <div className="pl-4">
        <p className="font-semibold text-sm">{moc.TEN_SUKIEN}</p>
        <p className="text-xs text-muted-foreground">
          {formatNullableDate(moc.NGAY_BATDAU)} - {formatNullableDate(moc.NGAY_KETTHUC)}
        </p>
        {moc.MOTA && <p className="text-sm mt-1 text-muted-foreground italic">"{moc.MOTA}"</p>}
      </div>
    </div>
  );
};

// Component thẻ Kế hoạch
const PlanCard = ({ plan }) => {
  const [isMilestonesOpen, setIsMilestonesOpen] = useState(false);
  const status = plan.TRANGTHAI;
  const config = statusConfig[status] || 'bg-gray-100 text-gray-800';

  // SỬA: đọc đúng snake_case từ backend
  const milestones = plan.moc_thoigians || [];

  return (
    <Collapsible open={isMilestonesOpen} onOpenChange={setIsMilestonesOpen} asChild>
      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-xl mb-1.5">{plan.TEN_DOT}</CardTitle>
              <Badge variant="outline" className={cn('border-0 text-xs', config)}>
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
            <Button variant="ghost" className="w-full justify-start px-0">
              <ChevronDown className={cn("h-4 w-4 mr-2 transition-transform", isMilestonesOpen && "-rotate-180")} />
              {isMilestonesOpen ? 'Ẩn' : 'Xem'} chi tiết các mốc thời gian ({milestones.length})
            </Button>
          </CollapsibleTrigger>
        </CardContent>

        <CollapsibleContent asChild>
          <CardFooter className="pt-0">
            <div className="pl-4 pt-4 mt-4 border-l-2 border-dashed border-primary/30 w-full">
              {milestones.length > 0 ? (
                milestones.map((moc, index) => (
                  <MilestoneItem
                    key={moc.ID}
                    moc={moc}
                    isLast={index === milestones.length - 1}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Kế hoạch này chưa có mốc thời gian chi tiết.</p>
              )}
            </div>
          </CardFooter>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

// Component trang chính
export default function MyPlansPage() {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <BookCopy className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Kế hoạch Khóa luận</h1>
          <p className="text-muted-foreground">Danh sách các đợt khóa luận bạn đang tham gia.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center p-10">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <h3 className="text-lg font-semibold">Không tìm thấy kế hoạch</h3>
            <p className="text-muted-foreground">Bạn hiện không tham gia vào bất kỳ đợt khóa luận nào đang hoạt động.</p>
          </CardContent>
        </Card>
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
