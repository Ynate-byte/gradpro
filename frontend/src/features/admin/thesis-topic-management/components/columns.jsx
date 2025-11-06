import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DataTableRowActions } from "./row-actions"; // Sẽ tạo ở bước 3
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

// Hàm helper tạo badge (lấy từ file index.jsx cũ)
const getStatusBadge = (status) => {
    const statusConfig = {
        "Nháp": { label: "Nháp", className: "bg-gray-100 text-gray-700" },
        "Chờ duyệt": { label: "Chờ duyệt", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700" },
        "Yêu cầu chỉnh sửa": { label: "Yêu cầu chỉnh sửa", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700" },
        "Đã duyệt": { label: "Đã duyệt", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-700" },
        "Đã đầy": { label: "Đã đầy", className: "bg-gray-200 text-gray-800" },
        "Đã khóa": { label: "Đã khóa", className: "bg-red-200 text-red-800" },
        "Từ chối": { label: "Từ chối", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700" },
    };
    const config = statusConfig[status] || { label: status, className: "bg-gray-100 text-gray-700" };
    return <Badge variant="outline" className={`px-2 py-0.5 text-xs ${config.className}`}>{config.label}</Badge>;
};

// Hiển thị biểu tượng sắp xếp
const SortIndicator = ({ column }) => {
    const sorted = column.getIsSorted();
    if (!sorted) {
        return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sorted === "desc" ? <ArrowDown className="ml-2 h-4 w-4" /> : <ArrowUp className="ml-2 h-4 w-4" />;
};

export const getColumns = ({ onViewDetails, onApprove, onReject, onRequestEdit }) => [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
                className="translate-y-[2px]"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
                className="translate-y-[2px]"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "TEN_DETAI",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Tên đề tài
                <SortIndicator column={column} />
            </Button>
        ),
        cell: ({ row }) => (
            <button
                onClick={() => onViewDetails(row.original.ID_DETAI)}
                className="max-w-[300px] xl:max-w-sm truncate font-medium text-left hover:underline text-primary dark:text-blue-400"
            >
                {row.original.TEN_DETAI}
            </button>
        )
    },
    {
        accessorKey: "ten_giang_vien",
        header: "GV Đề xuất",
        cell: ({ row }) => (
            <div className="text-sm text-muted-foreground max-w-[150px] truncate">
                {row.original.ten_giang_vien}
            </div>
        )
    },
    {
        accessorKey: "TRANGTHAI",
        header: "Trạng thái",
        cell: ({ row }) => getStatusBadge(row.original.TRANGTHAI),
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: "chuyennganh.TEN_CHUYENNGANH",
        header: "Chuyên ngành",
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            {row.original.chuyennganh?.TEN_CHUYENNGANH || 'N/A'}
          </div>
        )
    },
    { // Cột ẩn để lọc
        id: "chuyen_nganh_id",
        accessorFn: row => String(row.original?.chuyennganh?.ID_CHUYENNGANH),
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <DataTableRowActions
                row={row}
                onViewDetails={onViewDetails}
                onApprove={onApprove}
                onReject={onReject}
                onRequestEdit={onRequestEdit}
            />
        ),
    },
];