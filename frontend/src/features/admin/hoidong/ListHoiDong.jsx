import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  PlusCircle,
  Trash2,
  Pen,
  Shield,
  Shuffle,
  ArrowUp,
  BarChart3,
  AlertCircle,
  Users,
  BookOpen,
  Users2 
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import * as hoiDongService from "@/api/adminHoiDongService";
import { CreateHoiDongDialog } from "./CreateHoiDong";
import { AutoAssignMemberDialog } from "./AutoAssignMemberDialog";
import { WorkloadStatsDialog } from "./WorkloadStatsDialog";
import StatCard from "@/components/shared/StatCard";
import { useTheme } from "@/components/theme-provider";
import { getKhoaBomons } from "@/api/userService";

const QUERY_KEY_HOIDONG = "adminHoiDong";
const QUERY_KEY_STATS = "hoiDongStats";
const QUERY_KEY_FILTERS = "hoidongFilterOptions";

const loaiOptions = [
  { label: "Hội đồng Bảo vệ (3)", value: "hoidong" },
  { label: "Hội đồng Bảo vệ (5)", value: "hoidong5" },
  { label: "Phản biện", value: "phanbien" },
];

const chamDiemOptions = [
  { label: "Đã chấm điểm", value: "da_cham_diem" },
  { label: "Chưa chấm điểm", value: "chua_cham_diem" },
  { label: "Chưa phân bổ nhóm", value: "chua_phan_bo" },
];

const getVariants = (shouldReduce) => {
    if (shouldReduce) {
        return {
            container: { visible: { opacity: 1 } },
            item: { visible: { opacity: 1, y: 0, scale: 1 } }
        };
    }
    return {
        container: {
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } }
        },
        item: {
            hidden: { y: 30, opacity: 0, scale: 0.95 },
            visible: { y: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
        }
    };
};

// Component cho phép sửa nhanh tên/phòng ngay trên bảng
const EditableTextCell = ({ getValue, row, colId }) => {
    const initialValue = getValue() || "";
    const [value, setValue] = useState(initialValue);
    const [isEditing, setIsEditing] = useState(false);
    const queryClient = useQueryClient();
    
    const { mutate, isPending } = useMutation({
        mutationFn: (newValue) => {
            if (colId === "TEN_HOIDONG") {
                return hoiDongService.updateHoiDongName(row.original.ID_HOIDONG, newValue);
            } else if (colId === "PHONG") {
                return hoiDongService.updateHoiDongPhong(row.original.ID_HOIDONG, newValue);
            }
            return Promise.reject(new Error("Unknown column"));
        },
        onSuccess: (data) => {
            toast.success(data.message);
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY_HOIDONG] });
        },
        onError: (err) => {
            const errorMsg = err.response?.data?.errors?.TEN_HOIDONG?.[0] || err.response?.data?.error || "Cập nhật thất bại!";
            toast.error(errorMsg);
            setValue(initialValue);
        },
        onSettled: () => {
            setIsEditing(false);
        },
    });
  
    const onBlur = () => {
        const trimmedValue = String(value).trim();
        if (colId === "TEN_HOIDONG" && !trimmedValue) {
            toast.error("Tên Hội đồng không được để trống.");
            setValue(initialValue);
            setIsEditing(false);
            return;
        }
        if (trimmedValue !== initialValue) {
            mutate(trimmedValue);
        } else {
            setIsEditing(false);
        }
    };
  
    const onKeyDown = (e) => {
        if (e.key === "Enter") {
            e.currentTarget.blur();
        } else if (e.key === "Escape") {
            setValue(initialValue);
            e.currentTarget.blur();
        }
    };
  
    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);
  
    if (isPending) {
        return (
            <div className={cn("flex items-center justify-center h-8", colId === "TEN_HOIDONG" ? "justify-start" : "text-center")}>
                <Loader2 className="h-4 w-4 animate-spin" />
            </div>
        );
    }
  
    const displayValue = initialValue || <span className="text-muted-foreground italic">Trống</span>;
  
    if (isEditing) {
        return (
            <Input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                className={cn("h-8 min-w-[50px] p-2", colId === "TEN_HOIDONG" ? "w-full" : "w-16 text-center")}
            />
        );
    }
  
    return (
        <div
            className={cn(
                "w-full min-h-[32px] px-3 py-2 text-sm rounded-md cursor-pointer",
                "border border-transparent hover:bg-muted",
                colId === "TEN_HOIDONG" ? "font-medium text-primary" : "text-center"
            )}
            onClick={() => setIsEditing(true)}
        >
            {displayValue}
        </div>
    );
};

const ListHoiDong = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]); 
  const [rowSelection, setRowSelection] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAutoAssignOpen, setIsAutoAssignOpen] = useState(false);
  const [isUpgradeAlertOpen, setIsUpgradeAlertOpen] = useState(false);
  const [isSingleUpgradeAlertOpen, setIsSingleUpgradeAlertOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState(null);
  const [isInitialPlanSet, setIsInitialPlanSet] = useState(false);
  
  const [upgradeType, setUpgradeType] = useState("hoidong"); 

  const currentLoaiFilter = columnFilters.find(f => f.id === "LOAI")?.value?.[0];

  const shouldReduceMotion = useReducedMotion();
  const { reduceMotion } = useTheme();
  const isReduced = reduceMotion || shouldReduceMotion;
  const variants = useMemo(() => getVariants(isReduced), [isReduced]);

  // Query Filters
  const { data: filterOptions, isLoading: isLoadingFilters } = useQuery({
    queryKey: [QUERY_KEY_FILTERS],
    queryFn: async () => {
      const [khRes, deptRes] = await Promise.all([
        hoiDongService.getKeHoachOptions(),
        getKhoaBomons(),
      ]);
      return {
        kehoach: (khRes || []).map((kh) => ({
          label: kh.TEN_DOT,
          value: kh.ID_KEHOACH.toString(),
          ...kh,
        })),
        khoabomon: (deptRes || []).map((bm) => ({
          label: bm.TEN_KHOA_BOMON,
          value: bm.ID_KHOA_BOMON.toString(),
        })),
      };
    },
  });

  useEffect(() => {
    if (!isInitialPlanSet && filterOptions?.kehoach?.length > 0) {
      setSelectedPlanId(filterOptions.kehoach[0].value);
      setIsInitialPlanSet(true);
    }
  }, [filterOptions, isInitialPlanSet]);

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: [QUERY_KEY_STATS, selectedPlanId],
    queryFn: () => hoiDongService.getHoiDongStatistics(selectedPlanId || null),
    enabled: !!selectedPlanId,
  });

  const queryKey = [
    QUERY_KEY_HOIDONG,
    pagination,
    columnFilters,
    sorting,
    debouncedSearch,
    selectedPlanId,
  ];

  const { data, isLoading: isLoadingData } = useQuery({
    queryKey,
    queryFn: () =>
      hoiDongService.getHoiDongPaginated({
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        sort: sorting.length > 0 ? `${sorting[0].id},${sorting[0].desc ? "desc" : "asc"}` : undefined,
        search: debouncedSearch,
        kehoach: selectedPlanId,
        khoa_bomon_id: columnFilters.find((f) => f.id === "khoaBomon")?.value,
        loai: columnFilters.find((f) => f.id === "LOAI")?.value,
        trang_thai_cham_diem: columnFilters.find((f) => f.id === "trang_thai_cham_diem")?.value,
      }),
    placeholderData: (prev) => prev,
    enabled: !!selectedPlanId,
  });

  const deleteMutation = useMutation({
    mutationFn: (ids) => Promise.all(ids.map((id) => hoiDongService.deleteHoiDong(id))),
    onSuccess: () => {
      const count = deleteTarget === "bulk" ? Object.keys(rowSelection).length : 1;
      toast.success(`Đã xóa ${count} hội đồng thành công!`);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_HOIDONG] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_STATS] });
      setRowSelection({});
      setDeleteTarget(null);
      setIsAlertOpen(false);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Xóa thất bại!");
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: (ids) => hoiDongService.bulkUpgradeHoiDong(ids, upgradeType),
    onSuccess: (data) => {
      toast.success(data.message || "Nâng cấp hàng loạt thành công!");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_HOIDONG] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_STATS] });
      setRowSelection({});
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Nâng cấp thất bại!");
    },
    onSettled: () => {
      setIsUpgradeAlertOpen(false);
    },
  });

  const singleUpgradeMutation = useMutation({
    mutationFn: (id) => hoiDongService.upgradePhanBienToHoiDong(id, upgradeType),
    onSuccess: (data) => {
      toast.success(data.message || "Nâng cấp thành công!");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_HOIDONG] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY_STATS] });
      setUpgradeTarget(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || "Nâng cấp thất bại!");
    },
    onSettled: () => {
      setIsSingleUpgradeAlertOpen(false);
    },
  });

  const columns = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 50,
      },
      {
        accessorKey: "TEN_HOIDONG",
        header: "Tên hội đồng",
        cell: ({ row, getValue }) => (
          <EditableTextCell getValue={getValue} row={row} colId="TEN_HOIDONG" />
        ),
        size: 250,
      },
      {
        accessorKey: "LOAI",
        header: "Loại",
        cell: ({ row }) => {
            const loai = row.original.LOAI;
            return (
              <Badge
                variant={loai === "phanbien" ? "secondary" : "default"}
                className={cn(
                    "capitalize",
                    loai === "hoidong5" && "bg-purple-100 text-purple-700 hover:bg-purple-200"
                )}
              >
                {loai === "phanbien" ? "Phản biện" : (loai === 'hoidong5' ? "Bảo vệ (5)" : "Bảo vệ (3)")}
              </Badge>
            );
        },
        size: 120,
      },
      {
        accessorKey: "khoaBomon", 
        header: "Bộ môn",
        accessorFn: (row) => row.khoaBomon?.TEN_KHOA_BOMON,
        cell: ({ row }) => row.original.khoaBomon?.TEN_KHOA_BOMON || "-",
        size: 200,
      },
      {
        accessorKey: "trang_thai_cham_diem",
        header: "Trạng thái chấm",
        cell: ({ row }) => {
          const status = row.original.trang_thai_cham_diem;
          if (status === 'da_cham_diem') {
            return <Badge variant="success">Đã chấm điểm</Badge>;
          }
          if (status === 'chua_cham_diem') {
            return <Badge variant="warning">Chưa chấm điểm</Badge>;
          }
          return <Badge variant="secondary">Chưa phân bổ</Badge>;
        },
        size: 130,
      },
      {
        accessorKey: "PHONG",
        header: "Phòng",
        cell: ({ row, getValue }) => (
          <EditableTextCell getValue={getValue} row={row} colId="PHONG" />
        ),
        size: 80,
      },
      {
        accessorKey: "NGAY_BAOCAO",
        header: "Ngày Báo Cáo",
        cell: ({ row }) => {
          const date = row.original.NGAY_BAOCAO;
          try {
            return date ? format(parseISO(date), "dd/MM/yyyy", { locale: vi }) : "-";
          } catch {
            return date;
          }
        },
        size: 120,
      },
      {
        accessorKey: "GIO_BAOCAO",
        header: "Giờ Báo Cáo",
        cell: ({ row }) => {
          const time = row.original.GIO_BAOCAO;
          return time ? time.substring(0, 5) : "-";
        },
        size: 100,
      },
      {
        accessorKey: "so_thanh_vien",
        header: () => <div className="text-center">Thành viên</div>,
        cell: ({ row }) => <div className="text-center">{row.original.so_thanh_vien || 0}</div>,
        size: 100,
      },
      {
        accessorKey: "so_nhom",
        header: () => <div className="text-center">Nhóm P/B</div>,
        cell: ({ row }) => <div className="text-center">{row.original.so_nhom || 0}</div>,
        size: 100,
      },
      {
        id: "actions",
        header: () => <div className="text-right">Thao tác</div>,
        cell: ({ row }) => {
          const hoidong = row.original;
          const isPhanBien = hoidong.LOAI === "phanbien";
          return (
            <div className="text-right space-x-2 flex justify-end">
              {isPhanBien && (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => {
                    setUpgradeTarget(hoidong);
                    setUpgradeType("hoidong"); 
                    setIsSingleUpgradeAlertOpen(true);
                  }}
                  title="Nâng cấp lên Hội đồng Bảo vệ"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(`/admin/hoidong/detail/${hoidong.ID_HOIDONG}`)}
              >
                <Pen className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => {
                  setDeleteTarget(hoidong.ID_HOIDONG);
                  setIsAlertOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
        size: 100,
      },
    ],
    [navigate, queryClient]
  );

  const isLoading = isLoadingData || (isLoadingFilters && !filterOptions);
  const pageCount = data?.meta?.last_page ?? 0;
  const selectedIds = useMemo(
    () => Object.keys(rowSelection).map((key) => data?.data[key]?.ID_HOIDONG).filter(Boolean),
    [rowSelection, data?.data]
  );

  const handleCreateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY_HOIDONG] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY_STATS] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY_FILTERS] });
  };

  const handleStatCardClick = (filterId, value) => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
    setColumnFilters(prevFilters => {
      const otherFilters = prevFilters.filter(f => f.id !== filterId);
      if (value === undefined) {
        return otherFilters;
      }
      return [...otherFilters, { id: filterId, value: [value] }];
    });
  };

  const bulkActions = (
    <div className="flex items-center gap-2">
      {Object.keys(rowSelection).length > 0 && (
        <>
           <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => {
                setUpgradeType("hoidong"); // Reset
                setIsUpgradeAlertOpen(true);
              }}
              disabled={upgradeMutation.isPending || deleteMutation.isPending}
          >
              <ArrowUp className="mr-2 h-4 w-4" />
              Nâng cấp
          </Button>
          <Button
              variant="destructive"
              size="sm"
              className="h-8"
              onClick={() => {
              setDeleteTarget("bulk");
              setIsAlertOpen(true);
              }}
              disabled={deleteMutation.isPending}
          >
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa
          </Button>
        </>
      )}

      <Button size="sm" className="h-8 ml-2" onClick={() => setIsCreateOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Thêm hội đồng
      </Button>
    </div>
  );

  return (
    <>
      {/* [QUAN TRỌNG] Layout cha: 
        - h-full: Để chiếm toàn bộ chiều cao của component cha (AuthenticatedLayout)
        - overflow-hidden: Để ngăn scroll của body, buộc scroll xảy ra bên trong.
      */}
      <div className="p-4 md:p-8 space-y-6 h-full flex flex-col overflow-hidden">
        
        {/* 1. STAT CARDS SECTION (Flex shrink 0 để không bị co lại) */}
        <motion.div 
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 flex-shrink-0"
          variants={variants.container}
          initial="hidden"
          animate="visible"
        >
          {/* Card 1 */}
          <motion.div variants={variants.item}>
            <StatCard 
              icon={AlertCircle} 
              title="Nhóm chờ phân bổ" 
              value={isLoadingStats ? 'loading' : stats?.nhomCanPhanBo} 
              iconBgClass="bg-red-100" 
              iconColorClass="text-red-600"
              description="Đã nộp bài, chưa có HĐ"
              onClick={() => navigate('/admin/hoidong/phanbo')}
            />
          </motion.div>

          {/* Card 2 */}
          <motion.div variants={variants.item}>
            <StatCard 
              icon={Shield} 
              title="HĐ Bảo Vệ" 
              value={isLoadingStats ? 'loading' : stats?.totalBaoVe} 
              iconBgClass="bg-green-100" 
              iconColorClass="text-green-600"
              isActive={currentLoaiFilter === 'hoidong' || currentLoaiFilter === 'hoidong5'}
              onClick={() => handleStatCardClick('LOAI', 'hoidong')}
            />
          </motion.div>

          {/* Card 3 */}
          <motion.div variants={variants.item}>
            <StatCard 
              icon={BookOpen} 
              title="HĐ Phản Biện" 
              value={isLoadingStats ? 'loading' : stats?.totalPhanBien} 
              iconBgClass="bg-yellow-100" 
              iconColorClass="text-yellow-600"
              isActive={currentLoaiFilter === 'phanbien'}
              onClick={() => handleStatCardClick('LOAI', 'phanbien')}
            />
          </motion.div>

          {/* Card 4 */}
          <motion.div variants={variants.item}>
            <StatCard 
              icon={Users} 
              title="Tổng Hội đồng" 
              value={isLoadingStats ? 'loading' : stats?.totalHoiDong} 
              iconBgClass="bg-blue-100" 
              iconColorClass="text-blue-600"
              isActive={!currentLoaiFilter}
              onClick={() => handleStatCardClick('LOAI', undefined)}
            />
          </motion.div>
        </motion.div>

        {/* 2. ACTION BAR (Flex shrink 0) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="w-full md:w-[300px]">
                {isLoadingFilters ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    id="plan-select"
                    value={selectedPlanId}
                    onValueChange={(value) => {
                      setSelectedPlanId(value === "all" ? "" : value);
                      setPagination({ pageIndex: 0, pageSize: 10 });
                    }}
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue placeholder="Chọn kế hoạch..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả kế hoạch</SelectItem>
                      {filterOptions?.kehoach.map((plan) => (
                        <SelectItem key={plan.value} value={plan.value}>
                          {plan.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <Button variant="outline" onClick={() => setIsStatsOpen(true)} disabled={!selectedPlanId} className="bg-background">
                <BarChart3 className="mr-2 h-4 w-4" /> Thống kê tải
            </Button>
            
            <Button variant="secondary" onClick={() => setIsAutoAssignOpen(true)} disabled={!selectedPlanId} className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">
              <Shuffle className="mr-2 h-4 w-4" /> Phân công thành viên
            </Button>

            <Button asChild variant="default" className="bg-blue-600 hover:bg-blue-700">
              <Link to="/admin/hoidong/phanbo">
                <Users2 className="mr-2 h-4 w-4" /> Phân bổ nhóm
              </Link>
            </Button>
          </div>
        </div>

        {/* 3. DATA TABLE CONTAINER 
          - flex-1: Chiếm toàn bộ không gian còn lại
          - min-h-0: QUAN TRỌNG - Cho phép flex item co lại nhỏ hơn nội dung của nó (để scrollbar xuất hiện)
          - overflow-hidden: Để nội dung bên trong (Table) tự xử lý scroll
        */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <DataTable
              // [QUAN TRỌNG] Bật chế độ Flex Layout cho DataTable
              flexLayout={true}
              
              columns={columns}
              data={data?.data ?? []}
              pageCount={pageCount}
              loading={isLoading}
              pagination={pagination}
              setPagination={setPagination}
              columnFilters={columnFilters}
              setColumnFilters={setColumnFilters}
              sorting={sorting}
              setSorting={setSorting}
              onRowSelectionChange={setRowSelection}
              state={{ pagination, sorting, columnFilters, rowSelection }}
              searchColumnId="search"
              searchPlaceholder="Tìm tên hội đồng..."
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              
              khoaBomonFilterColumnId="khoaBomon"
              khoaBomonFilterOptions={filterOptions?.khoabomon}
              khoaBomonFilterTitle="Bộ môn"

              khoaBomonFilterColumnId2="LOAI" 
              khoaBomonFilterTitle2="Loại Hội đồng"
              khoaBomonFilterOptions2={loaiOptions} 
              
              statusColumnId="trang_thai_cham_diem"
              statusOptions={chamDiemOptions}
              
              bulkActions={bulkActions}
              onAddUser={() => setIsCreateOpen(true)}
              addBtnText="Thêm hội đồng"
            />
        </div>
        
        {/* Dialogs */}
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                  <AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={() => {
                      const ids = deleteTarget === "bulk" ? selectedIds : [deleteTarget];
                      deleteMutation.mutate(ids);
                  }}>Xóa</AlertDialogAction>
                </AlertDialogFooter>
             </AlertDialogContent>
        </AlertDialog>

        {/* Dialog Nâng cấp hàng loạt */}
        <AlertDialog open={isUpgradeAlertOpen} onOpenChange={setIsUpgradeAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Xác nhận nâng cấp hàng loạt</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-3">
                        <p>Bạn có chắc chắn muốn nâng cấp <b>{Object.keys(rowSelection).length}</b> hội đồng phản biện đã chọn?</p>
                        
                        <div className="bg-muted/50 p-3 rounded-md border">
                          <Label className="mb-2 block text-xs font-bold uppercase">Nâng cấp lên loại:</Label>
                          <RadioGroup value={upgradeType} onValueChange={setUpgradeType} className="flex flex-col gap-2">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="hoidong" id="bulk-up-3" />
                              <Label htmlFor="bulk-up-3" className="cursor-pointer">Hội đồng Bảo vệ (3 người)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="hoidong5" id="bulk-up-5" />
                              <Label htmlFor="bulk-up-5" className="cursor-pointer">Hội đồng Bảo vệ (5 người)</Label>
                            </div>
                          </RadioGroup>
                        </div>
                        
                        <p className="text-sm text-muted-foreground italic">
                          Lưu ý: Giảng viên phản biện hiện tại sẽ được chuyển thành "Thành viên".
                        </p>
                      </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction onClick={() => upgradeMutation.mutate(selectedIds)}>
                      Xác nhận
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Dialog Nâng cấp đơn lẻ */}
        <AlertDialog open={isSingleUpgradeAlertOpen} onOpenChange={setIsSingleUpgradeAlertOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Nâng cấp lên Hội đồng Bảo vệ</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                      <div className="space-y-3">
                        <p>Hội đồng <b>{upgradeTarget?.TEN_HOIDONG}</b> sẽ được chuyển từ loại <b>Phản biện</b> sang <b>Hội đồng bảo vệ</b>.</p>
                        
                        <div className="bg-muted/50 p-3 rounded-md border">
                          <Label className="mb-2 block text-xs font-bold uppercase">Chọn loại đích:</Label>
                          <RadioGroup value={upgradeType} onValueChange={setUpgradeType} className="flex flex-col gap-2">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="hoidong" id="single-up-3" />
                              <Label htmlFor="single-up-3" className="cursor-pointer">Hội đồng 3 thành viên</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="hoidong5" id="single-up-5" />
                              <Label htmlFor="single-up-5" className="cursor-pointer">Hội đồng 5 thành viên</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <p className="text-sm text-muted-foreground italic">
                          Giảng viên phản biện hiện tại sẽ được giữ lại với vai trò "Thành viên". Bạn cần bổ sung thêm các thành viên còn lại sau khi nâng cấp.
                        </p>
                      </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={() => upgradeTarget && singleUpgradeMutation.mutate(upgradeTarget.ID_HOIDONG)}>
                    Xác nhận nâng cấp
                  </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <CreateHoiDongDialog isOpen={isCreateOpen} setIsOpen={setIsCreateOpen} onSuccess={handleCreateSuccess} />
        <AutoAssignMemberDialog isOpen={isAutoAssignOpen} setIsOpen={setIsAutoAssignOpen} selectedPlanId={selectedPlanId} planOptions={filterOptions?.kehoach} onSuccess={handleCreateSuccess} />
        <WorkloadStatsDialog isOpen={isStatsOpen} setIsOpen={setIsStatsOpen} planId={selectedPlanId} />

      </div>
    </>
  );
};

export default ListHoiDong;