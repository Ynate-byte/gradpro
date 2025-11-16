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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { type: "spring", stiffness: 100 }
  }
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

  const { data: plansData, isLoading: isLoadingPlans } = useQuery({
    queryKey: ["allThesisPlans"],
    queryFn: getAllPlans,
  });

  useEffect(() => {
    if (!isInitialPlanSet && plansData && plansData.length > 0) {
      setSelectedPlanId(plansData[0].ID_KEHOACH.toString());
      setIsInitialPlanSet(true);
    }
  }, [plansData, isInitialPlanSet]);

  const queryKey = ["adminGroupsForGrading", pagination, columnFilters, sorting, selectedPlanId, debouncedSearchTerm];
  
  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      const filters = columnFilters.reduce((acc, filter) => {
        if (filter.id === 'trang_thai_cham') { 
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
    enabled: !!selectedPlanId, 
    placeholderData: (prev) => prev,
  });

  const isLoading = isLoadingGroups || isLoadingPlans;

  const stats = useMemo(() => {
    if (isLoading) {
      return { total: 'loading', daCham: 'loading', chuaCham: 'loading', chuaCoDeTai: 'loading' };
    }
    if (!groupsData) {
      return { total: 0, daCham: 0, chuaCham: 0, chuaCoDeTai: 0 };
    }
    
    const totalGroups = groupsData.meta?.total ?? 0;
    const daChamDiem = groupsData.data.filter(g => g.diem_tong_ket?.DIEM_TONG !== null && g.diem_tong_ket?.DIEM_TONG !== undefined).length;
    const chuaCoDeTai = groupsData.data.filter(g => !g.phancong_detai_nhom).length;
    const chuaChamDiem = groupsData.data.filter(g => g.phancong_detai_nhom && (g.diem_tong_ket?.DIEM_TONG === null || g.diem_tong_ket?.DIEM_TONG === undefined)).length;

    return {
      total: totalGroups,
      daCham: daChamDiem,
      chuaCham: chuaChamDiem,
      chuaCoDeTai: chuaCoDeTai
    };
  }, [groupsData, isLoading]);

  const planOptions = useMemo(() => {
    if (!plansData) return [];
    return plansData.map(plan => ({
      label: plan.TEN_DOT,
      value: plan.ID_KEHOACH.toString(),
    }));
  }, [plansData]);

  const statusOptions = [
    { label: 'Đã hoàn thành', value: 'Đã hoàn thành' },
    { label: 'Đang thực hiện', value: 'Đang thực hiện' },
    { label: 'Chưa có đề tài', value: 'Chưa có đề tài' }, 
  ];
  const handleGradeClick = (nhomId) => {
    navigate(`/admin/cham-diem/${nhomId}`);
  };

  const handleStatCardClick = (statusValue) => {
    setPagination(prev => ({ ...prev, pageIndex: 0 })); 
        if (!statusValue) {
      setColumnFilters(prev => prev.filter(f => f.id !== 'trang_thai_cham'));
      return;
    }
    
    // Set bộ lọc trạng thái
    setColumnFilters(prev => [
      ...prev.filter(f => f.id !== 'trang_thai_cham'), // Xóa filter cũ
      { id: 'trang_thai_cham', value: [statusValue] } // Thêm filter mới
    ]);
  };

  const columns = useMemo(() => getColumns(handleGradeClick), [handleGradeClick]);

  const pageCount = groupsData?.meta?.last_page ?? 0;
  const data = groupsData?.data ?? [];

  // Logic tự động co dãn chiều cao bảng
  const [tableHeight, setTableHeight] = useState('auto');
  const tableRef = useRef(null);

  useLayoutEffect(() => {
    if (tableRef.current) {
      const height = tableRef.current.getBoundingClientRect().height;
      setTableHeight(height);
    }
  }, [data, isLoading, pagination]); 

  return (
    <div className="p-4 md:p-8 space-y-5">
      
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

      <div className="flex justify-start">
        <div className="max-w-xs w-full space-y-2">
          <Select
            id="plan-select"
            value={selectedPlanId}
            onValueChange={(value) => setSelectedPlanId(value === "all" ? "" : value)}
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
        initial={false}
        animate={{ height: tableHeight }}
        transition={{
            duration: 0.5,
            ease: [0.4, 0, 0.2, 1]
        }}
        style={{ overflow: 'hidden' }}
      >
        <div ref={tableRef}>
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
        </div>
      </motion.div>
    </div>
  );
};

export default ListNhomChamDiem;