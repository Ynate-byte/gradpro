import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { getGroupsForGradingList, getGradingStatistics } from "@/api/chamDiemService";
import { getAllPlans } from "@/api/thesisPlanService";
import { DataTable } from "@/components/shared/data-table/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PenSquare, Users, CheckCircle, BookMarked } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import StatCard from "@/components/shared/StatCard";
import { useTheme } from "@/components/theme-provider";

const getVariants = (shouldReduce) => {
  if (shouldReduce) {
    return {
      container: { visible: { opacity: 1 } },
      item: { visible: { opacity: 1, y: 0 } },
      table: { visible: { opacity: 1, y: 0 } }
    };
  }
  return {
    container: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    },
    item: {
      hidden: { y: 20, opacity: 0 },
      visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
    },
    table: {
      hidden: { opacity: 0, y: 30 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2, ease: "easeOut" } }
    }
  };
};

const getColumns = (onGradeClick) => [
  {
    accessorKey: "TEN_NHOM",
    header: "Tên Nhóm",
    cell: ({ row }) => <div className="font-medium">{row.original.TEN_NHOM}</div>,
  },
  {
    accessorKey: "detai",
    header: "Đề Tài",
    cell: ({ row }) => {
      const detai = row.original.phancong_detai_nhom?.detai;
      return detai ? detai.TEN_DETAI : <span className="text-muted-foreground italic">Chưa đăng ký</span>;
    },
  },
  {
    accessorKey: "trang_thai_cham",
    header: "Trạng Thái",
    cell: ({ row }) => {
      const diem = row.original.diem_tong_ket?.DIEM_TONG;
      const phancong = row.original.phancong_detai_nhom;

      if (diem !== null && diem !== undefined) {
        return <Badge variant="success">Đã hoàn thành</Badge>;
      }
      if (phancong) {
        return <Badge variant="default">{phancong.TRANGTHAI || 'Đang thực hiện'}</Badge>;
      }
      return <Badge variant="secondary" className="italic">Chưa có đề tài</Badge>;
    },
  },
  {
    accessorKey: "diem_tong",
    header: "Điểm Tổng Kết",
    cell: ({ row }) => {
      const diem = row.original.diem_tong_ket?.DIEM_TONG;
      return diem !== null && diem !== undefined ? (
        <div className="font-bold text-lg text-primary">{parseFloat(diem).toFixed(2)}</div>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },
  {
    id: "actions",
    header: "Thao tác",
    cell: ({ row }) => {
      const nhom = row.original;
      const canGrade = !!nhom.phancong_detai_nhom;

      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onGradeClick(nhom.ID_NHOM)}
          disabled={!canGrade}
        >
          <PenSquare className="mr-2 h-4 w-4" />
          Chấm điểm
        </Button>
      );
    },
  },
];

const ListNhomChamDiem = () => {
  const navigate = useNavigate();
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [columnFilters, setColumnFilters] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [isInitialPlanSet, setIsInitialPlanSet] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const shouldReduceMotion = useReducedMotion();
  const { reduceMotion } = useTheme();
  const isReduced = reduceMotion || shouldReduceMotion;
  const variants = useMemo(() => getVariants(isReduced), [isReduced]);

  // 1. Lấy danh sách kế hoạch để hiển thị dropdown
  const { data: plansData, isLoading: isLoadingPlans } = useQuery({
    queryKey: ["allThesisPlans"],
    queryFn: getAllPlans,
  });

  // Tự động chọn kế hoạch mới nhất khi load trang
  useEffect(() => {
    if (!isInitialPlanSet && plansData && plansData.length > 0) {
      setSelectedPlanId(plansData[0].ID_KEHOACH.toString());
      setIsInitialPlanSet(true);
    }
  }, [plansData, isInitialPlanSet]);

  // 2. [FIX] Lấy thống kê từ Server (StatCards) thay vì tính từ client
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ["adminGradingStats", selectedPlanId],
    queryFn: () => getGradingStatistics(selectedPlanId),
    enabled: !!selectedPlanId, // Chỉ chạy khi đã chọn plan
  });

  // 3. Lấy danh sách nhóm (Bảng dữ liệu - Có phân trang)
  const queryKey = ["adminGroupsForGrading", pagination, columnFilters, selectedPlanId, debouncedSearchTerm];
  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      const filters = {
        plan_id: selectedPlanId,
        search: debouncedSearchTerm,
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
      };
      const response = await getGroupsForGradingList(filters);
      return response;
    },
    enabled: !!selectedPlanId,
    placeholderData: (prev) => prev,
  });

  const isLoading = isLoadingGroups || isLoadingPlans;
  const data = groupsData?.data ?? [];
  const pageCount = groupsData?.last_page ?? 0;

  // Xử lý dữ liệu thống kê để hiển thị
  const stats = useMemo(() => {
    if (isLoadingStats || !statsData) return { total: 'loading', daCham: 'loading', chuaCham: 'loading' };
    
    return {
      total: statsData.total,
      daCham: statsData.daCham,
      chuaCham: statsData.chuaCham,
    };
  }, [statsData, isLoadingStats]);

  const planOptions = useMemo(() => {
    if (!plansData) return [];
    return plansData.map(plan => ({
      label: plan.TEN_DOT,
      value: plan.ID_KEHOACH.toString(),
    }));
  }, [plansData]);

  const statusOptions = [
    { label: 'Đã hoàn thành', value: 'Đã hoàn thành' },
  ];

  const handleGradeClick = (nhomId) => {
    navigate(`/admin/cham-diem/${nhomId}`);
  };

  const columns = useMemo(() => getColumns(handleGradeClick), [handleGradeClick]);

  return (
    // [FIX] Thêm overflow-hidden vào container chính
    <div className="p-4 md:p-8 space-y-6 h-full flex flex-col overflow-hidden">
      {/* Stat Cards Section - [FIX] Thêm flex-shrink-0 */}
      <motion.div
        className="grid gap-4 md:grid-cols-3 flex-shrink-0"
        variants={variants.container}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={variants.item}>
          <StatCard
            icon={Users}
            title="Nhóm cần chấm (Đã nộp)"
            value={stats.total}
            isLoading={isLoadingStats}
            iconBgClass="bg-blue-100"
            iconColorClass="text-blue-600"
          />
        </motion.div>
        <motion.div variants={variants.item}>
          <StatCard
            icon={CheckCircle}
            title="Đã có điểm tổng kết"
            value={stats.daCham}
            isLoading={isLoadingStats}
            iconBgClass="bg-green-100"
            iconColorClass="text-green-600"
          />
        </motion.div>
        <motion.div variants={variants.item}>
          <StatCard
            icon={BookMarked}
            title="Chưa có điểm tổng kết"
            value={stats.chuaCham}
            isLoading={isLoadingStats}
            iconBgClass="bg-yellow-100"
            iconColorClass="text-yellow-600"
          />
        </motion.div>
      </motion.div>

      {/* Filter Section - [FIX] Thêm flex-shrink-0 */}
      <div className="flex justify-start flex-shrink-0">
        <div className="max-w-xs w-full space-y-2">
          <Label htmlFor="plan-select" className="text-sm font-medium">Lọc theo Kế hoạch</Label>
          <Select
            id="plan-select"
            value={selectedPlanId}
            onValueChange={(value) => {
              setSelectedPlanId(value === "all" ? "" : value);
              setPagination({ pageIndex: 0, pageSize: 10 });
            }}
            disabled={!plansData}
          >
            <SelectTrigger className="h-10 bg-background">
              <SelectValue placeholder="Tất cả kế hoạch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả kế hoạch</SelectItem>
              {planOptions.map((plan) => (
                <SelectItem key={plan.value} value={plan.value}>
                  {plan.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table Section - [FIX] Sử dụng flex-grow, min-h-0 và bỏ animation height */}
      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ duration: isReduced ? 0 : 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="flex-grow flex flex-col min-h-0"
      >
        <div className="h-full flex flex-col">
          <DataTable
            flexLayout={true} // [FIX] Bật chế độ Flex Layout cho bảng
            columns={columns}
            data={data}
            pageCount={pageCount}
            loading={isLoading}
            pagination={pagination}
            setPagination={setPagination}
            columnFilters={columnFilters}
            setColumnFilters={setColumnFilters}
            sorting={sorting}
            setSorting={setSorting}
            statusColumnId="trang_thai_cham"
            statusOptions={statusOptions}
            searchColumnId="search"
            searchPlaceholder="Tìm tên nhóm, đề tài..."
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default ListNhomChamDiem;