import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getGroups } from "@/api/adminGroupService"; // Gọi API lấy nhóm của Admin
import { getAllPlans } from "@/api/thesisPlanService"; // Gọi API lấy kế hoạch
import { DataTable } from "@/components/shared/data-table/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PenSquare } from "lucide-react";
// ----- THÊM IMPORT -----
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
// ----- KẾT THÚC THÊM IMPORT -----

// Định nghĩa các cột cho bảng
const createColumns = (onGradeClick) => [
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
      const status = row.original.phancong_detai_nhom?.TRANGTHAI || 'Chưa có đề tài';
      if (status === 'Đã hoàn thành') {
        return <Badge variant="success">Đã hoàn thành</Badge>;
      }
      if (status === 'Đang thực hiện') {
        return <Badge variant="default">Đang thực hiện</Badge>;
      }
      return <Badge variant="secondary" className="italic">{status}</Badge>;
    },
  },
  {
    accessorKey: "diem_tong",
    header: "Điểm Tổng Kết",
    cell: ({ row }) => {
      const diem = row.original.diem_tong_ket?.DIEM_TONG;
      return diem ? <div className="font-bold text-lg text-primary">{diem}</div> : <span className="text-muted-foreground">-</span>;
    },
  },
  {
    id: "actions",
    header: "Thao tác",
    cell: ({ row }) => {
      const nhom = row.original;
      if (!nhom.phancong_detai_nhom) {
        return null;
      }
      return (
        <Button variant="outline" size="sm" onClick={() => onGradeClick(nhom.ID_NHOM)}>
          <PenSquare className="mr-2 h-4 w-4" />
          Chấm điểm
        </Button>
      );
    },
  },
  // ----- XÓA CỘT ẢO ID_KEHOACH -----
];

const ListNhomChamDiem = () => {
  const navigate = useNavigate();
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [columnFilters, setColumnFilters] = useState([]);
  const [sorting, setSorting] = useState([]);
  // ----- THÊM STATE MỚI ĐỂ LỌC KẾ HOẠCH -----
  const [selectedPlanId, setSelectedPlanId] = useState("");

  // API: Lấy danh sách kế hoạch
  const { data: plansData, isLoading: isLoadingPlans } = useQuery({
    queryKey: ["allThesisPlans"],
    queryFn: getAllPlans,
  });

  // ----- XÓA useMemo cho selectedPlanId -----

  // API: Lấy danh sách nhóm dựa trên bộ lọc
  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    // ----- SỬA queryKey -----
    queryKey: ["adminGroups", pagination, columnFilters, sorting, selectedPlanId],
    queryFn: async () => {
      // ----- XÓA LOGIC IF(!selectedPlanId) -----
      
      const filters = columnFilters.reduce((acc, filter) => {
        if (Array.isArray(filter.value)) {
          acc[filter.id] = filter.value;
        } else if (filter.id === 'trang_thai_cham') { 
          acc['statuses'] = filter.value;
        } else {
          acc[filter.id] = filter.value;
        }
        return acc;
      }, {});

      // ----- THÊM LOGIC GỬI plan_id -----
      if (selectedPlanId) {
        filters['plan_id'] = selectedPlanId;
      }
      // ----- KẾT THÚC THÊM LOGIC GỬI plan_id -----

      const sortParams = sorting.length > 0 ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : undefined;

      const response = await getGroups({
        page: pagination.pageIndex + 1,
        per_page: pagination.pageSize,
        sort: sortParams,
        ...filters,
      });
      return response; 
    },
    // ----- SỬA enabled: Luôn chạy khi đã tải xong kế hoạch -----
    enabled: !isLoadingPlans,
    placeholderData: (prev) => prev,
  });

  // Định dạng options cho bộ lọc Kế hoạch
  const planOptions = useMemo(() => {
    if (!plansData) return [];
    return plansData.map(plan => ({
      label: plan.TEN_DOT,
      value: plan.ID_KEHOACH.toString(),
    }));
  }, [plansData]);

  // Định dạng options cho bộ lọc Trạng thái
  const statusOptions = [
    { label: 'Đang thực hiện', value: 'Đang thực hiện' },
    { label: 'Đã hoàn thành', value: 'Đã hoàn thành' },
    { label: 'Không đạt', value: 'Không đạt' },
    { label: 'Chưa có đề tài', value: 'Đang mở' }, 
  ];

  // Xử lý điều hướng
  const handleGradeClick = (nhomId) => {
    navigate(`/admin/cham-diem/${nhomId}`);
  };

  const columns = useMemo(() => createColumns(handleGradeClick), [handleGradeClick]);

  const pageCount = groupsData?.meta?.last_page ?? 0;
  const data = groupsData?.data ?? [];

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* ----- THÊM BỘ LỌC KẾ HOẠCH RIÊNG ----- */}
      <div className="max-w-xs space-y-2">
        <Label htmlFor="plan-select">Chọn Kế Hoạch</Label>
        <Select
          id="plan-select"
          value={selectedPlanId}
          // Cập nhật state, nếu chọn "Tất cả" thì set về rỗng ""
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
      {/* ----- KẾT THÚC BỘ LỌC KẾ HOẠCH ----- */}

      <DataTable
        columns={columns}
        data={data}
        pageCount={pageCount}
        loading={isLoadingGroups || isLoadingPlans}
        pagination={pagination}
        setPagination={setPagination}
        columnFilters={columnFilters}
        setColumnFilters={setColumnFilters}
        sorting={sorting}
        setSorting={setSorting}
        // ----- XÓA PROPS LỌC KẾ HOẠCH -----
        // khoaBomonFilterTitle="Kế hoạch"
        // khoaBomonFilterColumnId="ID_KEHOACH"
        // khoaBomonFilterOptions={planOptions}
        
        // Giữ lại bộ lọc trạng thái
        chuyenNganhFilterColumnId="trang_thai_cham"
        chuyenNganhFilterOptions={statusOptions}
        
        searchColumnId="search"
        searchPlaceholder="Tìm tên nhóm, đề tài..."
        className="flex-1 flex flex-col h-[calc(100vh-14rem)]"
        // ----- XÓA columnVisibility -----
      />
    </div>
  );
};

export default ListNhomChamDiem;