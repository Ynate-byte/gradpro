import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { 
    getGroupsForGradingList, 
    getGradingStatistics, 
    getStudentGradingList, 
    getStudentGradingStatistics 
} from "@/api/chamDiemService";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  PenSquare, Users, CheckCircle, BookMarked, 
  User, Layers, UserCheck, UserX, ListFilter, Filter, Info
} from "lucide-react";
// [MỚI] Import Popover components
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDebounce } from "@/hooks/useDebounce";
import StatCard from "@/components/shared/StatCard";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

// --- Helper: Lấy chữ cái đầu cho Avatar ---
const getInitials = (name) => {
    if (!name) return "SV";
    const parts = name.split(" ");
    if (parts.length >= 2) {
        return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

// --- Animation Variants ---
const getVariants = (shouldReduce) => {
  if (shouldReduce) {
    return {
      container: { visible: { opacity: 1 } },
      item: { visible: { opacity: 1, y: 0 } },
    };
  }
  return {
    container: {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    },
    item: {
      hidden: { y: 10, opacity: 0 },
      visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
    },
  };
};

// --- [MỚI] Component Popover Chi tiết điểm ---
const StudentScorePopover = ({ diemTong, diemHD, diemPB, diemHDong }) => {
    const score = parseFloat(diemTong);
    const colorClass = score >= 4.0 ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500";
    const bgClass = score >= 4.0 ? "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20" : "bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20";

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button 
                    variant="ghost" 
                    className={cn("h-8 px-2 font-bold text-base tabular-nums tracking-tight cursor-pointer border border-transparent hover:border-border", colorClass, bgClass)}
                >
                    {score.toFixed(2)}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2 border-b pb-2 mb-2">
                        <Info className="w-4 h-4 text-muted-foreground"/> Chi tiết điểm
                    </h4>
                    <div className="grid gap-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-xs">Hướng dẫn:</span>
                            <span className="font-bold font-mono">{diemHD !== null && diemHD !== undefined ? parseFloat(diemHD).toFixed(2) : '-'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-xs">Phản biện:</span>
                            <span className="font-bold font-mono">{diemPB !== null && diemPB !== undefined ? parseFloat(diemPB).toFixed(2) : '-'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-xs">Hội đồng:</span>
                            <span className="font-bold font-mono">{diemHDong !== null && diemHDong !== undefined ? parseFloat(diemHDong).toFixed(2) : '-'}</span>
                        </div>
                        <div className="border-t pt-2 mt-1 flex justify-between items-center font-bold text-primary">
                            <span>Tổng kết:</span>
                            <span>{score.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

// --- Cấu hình cột cho chế độ NHÓM ---
const getGroupColumns = (onGradeClick) => [
  {
    accessorKey: "TEN_NHOM",
    header: "Tên nhóm",
    cell: ({ row }) => (
        <div className="font-semibold text-sm text-blue-600 dark:text-blue-400">
            {row.original.TEN_NHOM}
        </div>
    ),
    size: 180,
  },
  {
    id: "TEN_DETAI", 
    header: "Đề tài",
    cell: ({ row }) => {
      const tenDeTai = row.original.phancong_detai_nhom?.detai?.TEN_DETAI;
      return (
        <div className="text-sm text-foreground/90 line-clamp-2" title={tenDeTai}>
             {tenDeTai || <span className="italic text-muted-foreground">-- Chưa đăng ký --</span>}
        </div>
      );
    },
    minSize: 300,
  },
  {
    accessorKey: "trang_thai_cham",
    header: "Trạng thái",
    cell: ({ row }) => {
      const diem = row.original.diem_tong_ket?.DIEM_TONG;
      const phancong = row.original.phancong_detai_nhom;

      if (diem !== null && diem !== undefined) {
        return (
            <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-600">Đã xong</span>
            </div>
        );
      }
      if (phancong) {
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-normal">Đang chấm</Badge>;
      }
      return <Badge variant="secondary" className="font-normal text-muted-foreground">Chưa sẵn sàng</Badge>;
    },
    size: 150,
    filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "diem_tong",
    header: "Điểm tổng",
    cell: ({ row }) => {
      const diem = row.original.diem_tong_ket?.DIEM_TONG;
      return diem !== null && diem !== undefined ? (
        <div className="font-bold text-base text-foreground tabular-nums">{parseFloat(diem).toFixed(2)}</div>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
    size: 100,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const nhom = row.original;
      const canGrade = !!nhom.phancong_detai_nhom;

      return (
        <div className="flex justify-end">
            <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => onGradeClick(nhom.ID_NHOM)}
                disabled={!canGrade}
            >
                <PenSquare className="mr-2 h-4 w-4" /> Chấm điểm
            </Button>
        </div>
      );
    },
    size: 120,
  },
];

// --- Cấu hình cột cho chế độ SINH VIÊN ---
const getStudentColumns = () => [
    {
      accessorKey: "MA_DINHDANH",
      header: "Mã sinh viên",
      cell: ({ row }) => (
        <div className="font-mono text-xs text-muted-foreground">
            {row.original.MA_DINHDANH}
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: "HODEM_VA_TEN",
      header: "Họ và tên",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 py-1">
            <Avatar className="h-8 w-8 border border-border bg-background">
                <AvatarFallback className="text-[10px] font-bold text-primary bg-primary/10">
                    {getInitials(row.original.HODEM_VA_TEN)}
                </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm text-foreground">
                {row.original.HODEM_VA_TEN}
            </span>
        </div>
      ),
      minSize: 220,
    },
    {
      accessorKey: "TEN_NHOM",
      header: "Nhóm",
      cell: ({ row }) => (
         <div className="text-xs font-medium text-muted-foreground truncate bg-muted/50 px-2 py-1 rounded w-fit">
            {row.original.TEN_NHOM}
         </div>
      ),
      size: 150,
    },
    {
      accessorKey: "TEN_DETAI",
      header: "Đề tài",
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground line-clamp-2" title={row.original.TEN_DETAI}>
             {row.original.TEN_DETAI || <span className="italic">--</span>}
        </div>
      ),
      minSize: 250,
    },
    {
        accessorKey: "KET_QUA",
        header: "Kết quả",
        cell: ({ row }) => {
            const status = row.original.KET_QUA;
            if (status === 'Đậu') {
                return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200 shadow-none font-medium"><CheckCircle className="w-3 h-3 mr-1"/> Đậu</Badge>;
            } else if (status === 'Rớt') {
                return <Badge variant="destructive" className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200 shadow-none font-medium"><UserX className="w-3 h-3 mr-1"/> Rớt</Badge>;
            } else {
                return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 font-medium"><ListFilter className="w-3 h-3 mr-1"/> Chờ điểm</Badge>;
            }
        },
        size: 130,
        filterFn: (row, id, value) => {
             return value.includes(row.getValue(id));
        }
    },
    {
      accessorKey: "DIEM_TONG",
      header: "Điểm",
      cell: ({ row }) => {
        const diem = row.original.DIEM_TONG;
        if (diem === null || diem === undefined) return <span className="text-muted-foreground font-mono pl-2">-</span>;
        
        // Lấy các điểm thành phần (Lưu ý: Backend cần trả về các trường này trong getStudentGradingList)
        // Nếu backend chưa trả về đủ, UI sẽ hiện dấu '-'
        const diemHD = row.original.DIEM_HD;
        const diemPB = row.original.DIEM_PB_RAW; // Đã có sẵn trong query gốc
        const diemHDong = row.original.DIEM_HDONG;

        return (
            <StudentScorePopover 
                diemTong={diem} 
                diemHD={diemHD} 
                diemPB={diemPB} 
                diemHDong={diemHDong} 
            />
        );
      },
      size: 80,
    },
];

const ListNhomChamDiem = () => {
  const navigate = useNavigate();
  
  // State
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [columnFilters, setColumnFilters] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [isInitialPlanSet, setIsInitialPlanSet] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // State chuyển đổi chế độ xem
  const [viewMode, setViewMode] = useState("groups"); // 'groups' | 'students'

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const shouldReduceMotion = useReducedMotion();
  const { reduceMotion } = useTheme();
  const isReduced = reduceMotion || shouldReduceMotion;
  const variants = useMemo(() => getVariants(isReduced), [isReduced]);

  // 1. Lấy danh sách kế hoạch
  const { data: plansData } = useQuery({
    queryKey: ["allThesisPlans"],
    queryFn: getAllPlans,
  });

  useEffect(() => {
    if (!isInitialPlanSet && plansData && plansData.length > 0) {
      setSelectedPlanId(plansData[0].ID_KEHOACH.toString());
      setIsInitialPlanSet(true);
    }
  }, [plansData, isInitialPlanSet]);

  // 2. Lấy thống kê
  const { data: groupStatsData, isLoading: isLoadingGroupStats } = useQuery({
    queryKey: ["adminGradingStats", selectedPlanId],
    queryFn: () => getGradingStatistics(selectedPlanId),
    enabled: !!selectedPlanId && viewMode === 'groups',
  });

  const { data: studentStatsData, isLoading: isLoadingStudentStats } = useQuery({
    queryKey: ["adminStudentGradingStats", selectedPlanId],
    queryFn: () => getStudentGradingStatistics(selectedPlanId),
    enabled: !!selectedPlanId && viewMode === 'students',
  });

  // 3. Query Chính: Fetch dữ liệu bảng
  const queryKey = ["adminGradingTable", viewMode, pagination, selectedPlanId, debouncedSearchTerm, columnFilters];
  
  const { data: tableData, isLoading: isLoadingTable } = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
        const params = {
            plan_id: selectedPlanId,
            search: debouncedSearchTerm,
            page: pagination.pageIndex + 1,
            per_page: pagination.pageSize,
        };

        if (viewMode === 'groups') {
            const statusFilter = columnFilters.find(f => f.id === 'trang_thai_cham')?.value;
            return await getGroupsForGradingList(params);
        } else {
            const resultFilter = columnFilters.find(f => f.id === 'KET_QUA')?.value;
            if (resultFilter && resultFilter.length > 0) {

                const mapFilter = {
                    "Đậu": "passed",
                    "Rớt": "failed",
                    "Chưa chấm xong": "pending"
                };
                
                const backendVal = mapFilter[resultFilter[0]];
                if (backendVal) params.result = backendVal;
            }
            
            return await getStudentGradingList(params);
        }
    },
    enabled: !!selectedPlanId,
    placeholderData: (prev) => prev,
  });

  const data = tableData?.data ?? [];
  const pageCount = tableData?.last_page ?? 0;

  const handleGradeClick = (nhomId) => {
    navigate(`/admin/cham-diem/${nhomId}`);
  };

  // Cấu hình Columns và Filter Options
  const columns = useMemo(() => {
      if (viewMode === 'students') {
          return getStudentColumns();
      }
      return getGroupColumns(handleGradeClick);
  }, [viewMode, handleGradeClick]);

  // Options cho bộ lọc trạng thái
  const statusOptions = useMemo(() => {
      if (viewMode === 'students') {
          return [
              { value: "Đậu", label: "Đậu"},
              { value: "Rớt", label: "Rớt"},
              { value: "Chưa chấm xong", label: "Chưa chấm xong"},
          ];
      } else {
          return []; 
      }
  }, [viewMode]);

  // Render Stats Cards
  const renderStats = () => {
      if (viewMode === 'groups') {
          const stats = groupStatsData || { total: 0, daCham: 0, chuaCham: 0 };
          const loading = isLoadingGroupStats;
          return (
            <>
                <motion.div variants={variants.item}>
                    <StatCard icon={Users} title="Tổng số nhóm" value={stats.total} isLoading={loading} iconBgClass="bg-blue-100 dark:bg-blue-900/30" iconColorClass="text-blue-600 dark:text-blue-400" />
                </motion.div>
                <motion.div variants={variants.item}>
                    <StatCard icon={CheckCircle} title="Đã hoàn thành" value={stats.daCham} isLoading={loading} iconBgClass="bg-emerald-100 dark:bg-emerald-900/30" iconColorClass="text-emerald-600 dark:text-emerald-400" />
                </motion.div>
                <motion.div variants={variants.item}>
                    <StatCard icon={BookMarked} title="Chưa hoàn thành" value={stats.chuaCham} isLoading={loading} iconBgClass="bg-amber-100 dark:bg-amber-900/30" iconColorClass="text-amber-600 dark:text-amber-400" />
                </motion.div>
            </>
          );
      } else {
          const stats = studentStatsData || { total: 0, passed: 0, failed: 0 };
          const loading = isLoadingStudentStats;
          return (
            <>
                <motion.div variants={variants.item}>
                    <StatCard icon={User} title="Tổng Sinh Viên" value={stats.total} isLoading={loading} iconBgClass="bg-indigo-100 dark:bg-indigo-900/30" iconColorClass="text-indigo-600 dark:text-indigo-400" />
                </motion.div>
                <motion.div variants={variants.item}>
                    <StatCard icon={UserCheck} title="Đậu" value={stats.passed} isLoading={loading} iconBgClass="bg-emerald-100 dark:bg-emerald-900/30" iconColorClass="text-emerald-600 dark:text-emerald-400" />
                </motion.div>
                <motion.div variants={variants.item}>
                    <StatCard icon={UserX} title="Rớt" value={stats.failed} isLoading={loading} iconBgClass="bg-rose-100 dark:bg-rose-900/30" iconColorClass="text-rose-600 dark:text-rose-400" />
                </motion.div>
            </>
          );
      }
  };

  // Render nội dung DataTable
  const renderDataTable = () => {
      return (
        <DataTable
            flexLayout={true}
            columns={columns}
            data={data}
            pageCount={pageCount}
            loading={isLoadingTable}
            pagination={pagination}
            setPagination={setPagination}
            columnFilters={columnFilters}
            setColumnFilters={setColumnFilters}
            sorting={sorting}
            setSorting={setSorting}
            
            searchColumnId={viewMode === 'groups' ? "TEN_NHOM" : "HODEM_VA_TEN"}
            searchPlaceholder={viewMode === 'groups' ? "Tìm tên nhóm, đề tài..." : "Tìm tên sinh viên, MSSV..."}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            
            statusColumnId={viewMode === 'students' ? "KET_QUA" : null}
            statusOptions={statusOptions}
            
            bulkActions={
                <div className="flex items-center gap-2">
                    <div className="w-[250px]">
                        <Select
                            value={selectedPlanId}
                            onValueChange={(value) => {
                                setSelectedPlanId(value === "all" ? "" : value);
                                setPagination({ pageIndex: 0, pageSize: 10 });
                            }}
                            disabled={!plansData}
                        >
                            <SelectTrigger className="h-8 text-xs bg-background border-dashed">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                                    <SelectValue placeholder="Chọn kế hoạch..." />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                            {plansData?.map((plan) => (
                                <SelectItem key={plan.ID_KEHOACH} value={plan.ID_KEHOACH.toString()}>
                                    {plan.TEN_DOT}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            }

            containerClassName="border-none shadow-none"
        />
      );
  };

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      <motion.div
        className="flex-none grid gap-4 grid-cols-2 md:grid-cols-3"
        variants={variants.container}
        initial="hidden"
        animate="visible"
        key={viewMode}
      >
        {renderStats()}
      </motion.div>

      <div className="flex-1 min-h-0 flex flex-col bg-card rounded-lg border shadow-sm">
          <Tabs value={viewMode} onValueChange={setViewMode} className="flex-1 flex flex-col min-h-0">
            <div className="px-4 pt-4 pb-2 border-b flex items-center justify-between bg-muted/10">
                <TabsList className="bg-muted/50">
                    <TabsTrigger value="groups" className="gap-2">
                        <Layers className="w-4 h-4" /> Theo Nhóm
                    </TabsTrigger>
                    <TabsTrigger value="students" className="gap-2">
                        <User className="w-4 h-4" /> Theo Sinh Viên
                    </TabsTrigger>
                </TabsList>
            </div>

            <div className="flex-1 min-h-0 p-4 pt-2">
                <TabsContent value="groups" className="h-full mt-0 data-[state=active]:flex flex-col">
                    {renderDataTable()}
                </TabsContent>
                <TabsContent value="students" className="h-full mt-0 data-[state=active]:flex flex-col">
                    {renderDataTable()}
                </TabsContent>
            </div>
          </Tabs>
      </div>
    </div>
  );
};

export default ListNhomChamDiem;