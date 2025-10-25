import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTableRowActions } from "./row-actions";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown, ShieldCheck, Briefcase, GraduationCap, Circle } from "lucide-react"; // Thêm Circle
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils"; // Import cn

// Lấy ký tự đầu của tên và họ
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

// Cấu hình vai trò với icon và màu badge mới
const roleConfig = {
    'Admin': { icon: ShieldCheck, color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700" },
    'Giảng viên': { icon: Briefcase, color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700" }, // Đổi sang Indigo
    'Sinh viên': { icon: GraduationCap, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700" }, // Màu xanh dương cho Sinh viên
    'Giáo vụ': { icon: Briefcase, color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-700" },
    'Trưởng khoa': { icon: Briefcase, color: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-700" }, // Đổi sang Teal
};


// Hiển thị biểu tượng sắp xếp cho cột
const SortIndicator = ({ column }) => {
    const sorted = column.getIsSorted();
    if (!sorted) {
        return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sorted === "desc" ? <ArrowDown className="ml-2 h-4 w-4" /> : <ArrowUp className="ml-2 h-4 w-4" />;
};

// Tạo cấu hình các cột cho bảng dữ liệu
export const getColumns = ({ onEdit, onSuccess, onViewDetails }) => [
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
        accessorKey: "HODEM_VA_TEN",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Người dùng
                <SortIndicator column={column} />
            </Button>
        ),
        cell: ({ row }) => (
            <div className="flex items-center gap-3 pl-2">
                <Avatar className="h-9 w-9 border"> {/* Thêm border */}
                    <AvatarFallback>{getInitials(row.original.HODEM_VA_TEN)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <button
                        onClick={() => onViewDetails(row.original)}
                        className="max-w-[200px] truncate font-medium text-left hover:underline"
                    >
                        {row.original.HODEM_VA_TEN}
                    </button>
                    <span className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {row.original.EMAIL}
                    </span>
                </div>
            </div>
        )
    },
    {
        accessorKey: "MA_DINHDANH",
        header: "Mã định danh",
        cell: ({ row }) => (
            <div className="font-mono text-sm">
                {row.original.MA_DINHDANH}
            </div>
        )
    },
    {
        id: "vai_tro",
        accessorKey: "vaitro.TEN_VAITRO",
        header: "Vai trò",
        cell: ({ row }) => {
            const roleName = row.original.vaitro.TEN_VAITRO;
            const positionName = row.original.giangvien?.CHUCVU;
            const displayRoleName = positionName || roleName;
            // Ưu tiên config theo chức vụ nếu có, nếu không thì theo vai trò
            const config = roleConfig[displayRoleName] || roleConfig[roleName] || {};
            const Icon = config.icon || null;
            return (
                <Badge variant="outline" className={cn('gap-1.5', config.color)}> {/* Thêm border từ config */}
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {displayRoleName}
                </Badge>
            );
        },
    },
    {
        id: "unit_major",
        header: "Đơn vị / Chuyên ngành",
        cell: ({ row }) => {
            const user = row.original;
            if (user.vaitro.TEN_VAITRO === 'Sinh viên') {
                return (
                    <div className="text-xs text-muted-foreground">
                        {user.sinhvien?.chuyennganh?.TEN_CHUYENNGANH || 'N/A'}
                    </div>
                );
            }
            if (user.giangvien) {
                return (
                    <div className="text-xs text-muted-foreground">
                        {user.giangvien?.khoabomon?.TEN_KHOA_BOMON || 'N/A'}
                    </div>
                );
            }
            return (
                <div className="text-xs text-muted-foreground">
                    N/A
                </div>
            );
        }
    },
    { // Cột ẩn để lọc chuyên ngành
        id: "chuyen_nganh_id",
        accessorFn: row => String(row.original?.sinhvien?.ID_CHUYENNGANH),
        enableHiding: false, // Giữ lại để filter hoạt động
    },
    { // Cột ẩn để lọc khoa/bộ môn
        id: "khoa_bomon_id",
        accessorFn: row => String(row.original?.giangvien?.ID_KHOA_BOMON),
        enableHiding: false, // Giữ lại để filter hoạt động
    },
    {
        id: "trang_thai",
        accessorKey: "TRANGTHAI_KICHHOAT",
        header: "Trạng thái",
        cell: ({ row }) => {
            const isActive = row.getValue("trang_thai");
            return (
                <div className="flex items-center gap-2">
                    {/* Sử dụng icon Circle thay cho span */}
                    <Circle className={`h-2.5 w-2.5 ${isActive ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}`} />
                    <span className="text-muted-foreground text-xs">
                        {isActive ? "Hoạt động" : "Vô hiệu"}
                    </span>
                </div>
            );
        },
    },
    {
        accessorKey: "NGAYTAO",
        header: "Ngày tham gia",
        cell: ({ row }) => {
            if (!row.original.NGAYTAO) return null;
            const date = new Date(row.original.NGAYTAO);
            return (
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger>
                            <div className="text-xs text-muted-foreground cursor-help">
                                {formatDistanceToNow(date, { addSuffix: true, locale: vi })}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{format(date, 'dd/MM/yyyy HH:mm:ss')}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <DataTableRowActions row={row} onEdit={onEdit} onSuccess={onSuccess} />
        ),
    },
];