import React, { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { getGroups } from "@/api/adminGroupService"; 
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
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, PenSquare, Users, CheckCircle, FileWarning, BookMarked } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

import StatCard from "@/components/shared/StatCard"; 

// Biến thể cho container chính (các thẻ thống kê)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    }
  }
};

// Biến thể cho từng thẻ thống kê
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { type: "spring", stiffness: 100 }
  }
};

// Biến thể cho bảng (fade in và slide up)
const tableVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.2, ease: "easeOut" }
  }
};

// Định nghĩa các cột cho DataTable
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
      // Truy cập thông tin đề tài từ phancong_detai_nhom
      const detai = row.original.phancong_detai_nhom?.detai;
      return detai ? detai.TEN_DETAI : <span className="text-muted-foreground italic">Chưa đăng ký</span>;
    },
  },
  {
    accessorKey: "trang_thai_cham", 
    header: "Trạng Thái",
    cell: ({ row }) => {
      // Kiểm tra điểm tổng kết trước
      const diem = row.original.diem_tong_ket?.DIEM_TONG;
      const phancong = row.original.phancong_detai_nhom;

      if (diem !== null && diem !== undefined) {
        return <Badge variant="success">Đã hoàn thành</Badge>;
      }
      if (phancong) {
        // Nếu đã phân công đề tài nhưng chưa có điểm
        return <Badge variant="default">{phancong.TRANGTHAI || 'Đang thực hiện'}</Badge>;
      }
      // Nếu chưa có đề tài phân công
      return <Badge variant="secondary" className="italic">Chưa có đề tài</Badge>;
    },
  },
  {
    accessorKey: "diem_tong",
    header: "Điểm Tổng Kết",
    cell: ({ row }) => {
      // Truy cập điểm tổng kết
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
      // Chỉ cho phép chấm điểm nếu nhóm đã có đề tài được phân công
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
  // State quản lý phân trang, bộ lọc và sắp xếp
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [columnFilters, setColumnFilters] = useState([]);
  const [sorting, setSorting] = useState([]);
  // State quản lý kế hoạch được chọn
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [isInitialPlanSet, setIsInitialPlanSet] = useState(false);
  // State quản lý tìm kiếm
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Lấy danh sách Kế hoạch
  const { data: plansData, isLoading: isLoadingPlans } = useQuery({
    queryKey: ["allThesisPlans"],
    queryFn: getAllPlans,
  });

  // Thiết lập Kế hoạch đầu tiên khi dữ liệu Plans được tải
  useEffect(() => {
    if (!isInitialPlanSet && plansData && plansData.length > 0) {
      setSelectedPlanId(plansData[0].ID_KEHOACH.toString());
      setIsInitialPlanSet(true);
    }
  }, [plansData, isInitialPlanSet]);

  // Key query phụ thuộc vào state của bảng và plan ID
  const queryKey = ["adminGroupsForGrading", pagination, columnFilters, sorting, selectedPlanId, debouncedSearchTerm];
  
  // Lấy danh sách Nhóm
  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      // Chuyển đổi columnFilters sang định dạng query params
      const filters = columnFilters.reduce((acc, filter) => {
        if (filter.id === 'trang_thai_cham') { 
          // Giả định backend chấp nhận statuses là mảng/chuỗi trạng thái
          acc['statuses'] = filter.value; 
        } else {
          acc[filter.id] = filter.value;
        }
        return acc;
      }, {});

      if (selectedPlanId) {
        filters['plan_id'] = selectedPlanId;
      }
      if (debouncedSearchTerm) {
        filters['search'] = debouncedSearchTerm;
      }

      const sortParams = sorting.length > 0 ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : undefined;

      const response = await getGroups({
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        sort: sortParams,
        ...filters,
      });
      return response; 
    },
    enabled: !!selectedPlanId, // Chỉ chạy query khi đã chọn kế hoạch
    placeholderData: (prev) => prev,
  });

  const isLoading = isLoadingGroups || isLoadingPlans;

  // Lấy dữ liệu và thông tin phân trang
  const data = groupsData?.data ?? [];
  const pageCount = groupsData?.meta?.last_page ?? 0;

  // Tính toán thống kê
  const stats = useMemo(() => {
    if (isLoading) {
      return { total: 'loading', daCham: 'loading', chuaCham: 'loading', chuaCoDeTai: 'loading' };
    }
    if (!groupsData) {
      return { total: 0, daCham: 0, chuaCham: 0, chuaCoDeTai: 0 };
    }
    
    const totalGroups = groupsData.meta?.total ?? 0;
    
    const groups = groupsData.data || [];
    
    // Đã hoàn thành (có điểm tổng kết)
    const daChamDiem = groups.filter(g => g.diem_tong_ket?.DIEM_TONG !== null && g.diem_tong_ket?.DIEM_TONG !== undefined).length;
    // Chưa có đề tài
    const chuaCoDeTai = groups.filter(g => !g.phancong_detai_nhom).length;
    // Đang thực hiện (có đề tài nhưng chưa có điểm)
    const chuaChamDiem = groups.filter(g => g.phancong_detai_nhom && (g.diem_tong_ket?.DIEM_TONG === null || g.diem_tong_ket?.DIEM_TONG === undefined)).length;

    return {
      total: totalGroups,
      daCham: daChamDiem,
      chuaCham: chuaChamDiem,
      chuaCoDeTai: chuaCoDeTai
    };
  }, [groupsData, isLoading]);

  // Tùy chọn cho Select Kế hoạch
  const planOptions = useMemo(() => {
    if (!plansData) return [];
    return plansData.map(plan => ({
      label: plan.TEN_DOT,
      value: plan.ID_KEHOACH.toString(),
    }));
  }, [plansData]);

  // Tùy chọn cho filter trạng thái
  const statusOptions = [
    { label: 'Đã hoàn thành', value: 'Đã hoàn thành' },
    { label: 'Đang thực hiện', value: 'Đang thực hiện' },
    { label: 'Chưa có đề tài', value: 'Chưa có đề tài' }, 
  ];
  
  // Handler khi click nút Chấm điểm
  const handleGradeClick = (nhomId) => {
    navigate(`/admin/cham-diem/${nhomId}`);
  };

  // Handler khi click vào thẻ thống kê (để lọc theo trạng thái)
  const handleStatCardClick = (statusValue) => {
    setPagination(prev => ({ ...prev, pageIndex: 0 })); 
    const filterId = 'trang_thai_cham';
    
    if (!statusValue) {
      // Xóa bộ lọc trạng thái nếu click vào "Tổng số nhóm"
      setColumnFilters(prev => prev.filter(f => f.id !== filterId));
      return;
    }
    
    // Thiết lập bộ lọc trạng thái mới
    setColumnFilters(prev => {
      const existingFilters = prev.filter(f => f.id !== filterId);
      return [
        ...existingFilters, 
        { id: filterId, value: [statusValue] } 
      ];
    });
  };

  // Memoize columns để tránh re-render không cần thiết
  const columns = useMemo(() => getColumns(handleGradeClick), [handleGradeClick]);

  return (
    <div className="p-4 md:p-8 space-y-6">      
      {/* Thẻ Thống Kê */}
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <StatCard 
            icon={Users} 
            title="Tổng số nhóm" 
            value={stats.total} 
            isLoading={isLoading}
            iconBgClass="bg-blue-100" 
            iconColorClass="text-blue-600"
            onClick={() => handleStatCardClick(null)} // Click để xóa lọc
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard 
            icon={CheckCircle} 
            title="Đã hoàn thành" 
            value={stats.daCham} 
            isLoading={isLoading}
            iconBgClass="bg-green-100" 
            iconColorClass="text-green-600"
            onClick={() => handleStatCardClick('Đã hoàn thành')}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard 
            icon={BookMarked} 
            title="Đang thực hiện" 
            value={stats.chuaCham} 
            isLoading={isLoading}
            iconBgClass="bg-yellow-100" 
            iconColorClass="text-yellow-600"
            onClick={() => handleStatCardClick('Đang thực hiện')}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard 
            icon={FileWarning} 
            title="Chưa có đề tài" 
            value={stats.chuaCoDeTai} 
            isLoading={isLoading}
            iconBgClass="bg-gray-100" 
            iconColorClass="text-gray-600"
            onClick={() => handleStatCardClick('Chưa có đề tài')}
          />
        </motion.div>
      </motion.div>

      {/* Bộ lọc Kế hoạch */}
      <div className="flex justify-start">
        <div className="max-w-xs w-full space-y-2">
          <Label htmlFor="plan-select" className="text-sm font-medium">Lọc theo Kế hoạch</Label>
          <Select
            id="plan-select"
            value={selectedPlanId}
            onValueChange={(value) => setSelectedPlanId(value === "all" ? "" : value)}
            disabled={isLoadingPlans}
          >
            <SelectTrigger>
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

      {/* Bảng Dữ liệu */}
      <motion.div
        className="flex-grow min-h-0"
        variants={tableVariants}
        initial="hidden"
        animate="visible"
      >
        <DataTable
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
      </motion.div>
    </div>
  );
};

export default ListNhomChamDiem;