import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTableRowActions } from "./row-actions";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown, ShieldCheck, Briefcase, GraduationCap, Circle, Award, BookOpen, UserCog } from "lucide-react";
import { format, formatDistanceToNow, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Helper: Lấy ký tự đầu của tên và họ
const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

// 1. [CẬP NHẬT] Cấu hình vai trò & chức vụ với màu sắc phân cấp rõ ràng
const roleConfig = {
    // --- Vai trò hệ thống ---
    'Admin': { 
        icon: ShieldCheck, 
        color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700" 
    },
    'Giáo vụ': { 
        icon: UserCog, 
        color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700" 
    },
    
    // --- Ban chủ nhiệm Khoa (Màu Teal/Emerald - Quyền cao nhất chuyên môn) ---
    'Trưởng khoa': { 
        icon: Award, 
        color: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-700 font-bold" 
    },
    'Phó trưởng khoa': { 
        icon: Award, 
        color: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800" 
    },

    // --- Ban chủ nhiệm Bộ môn (Màu Purple/Violet) ---
    'Trưởng bộ môn': { 
        icon: BookOpen, 
        color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-700 font-semibold" 
    },
    'Phó trưởng bộ môn': { 
        icon: BookOpen, 
        color: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800" 
    },

    // --- Giảng viên & Sinh viên ---
    'Giảng viên': { 
        icon: Briefcase, 
        color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" 
    },
    'Sinh viên': { 
        icon: GraduationCap, 
        color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800" 
    },
};

// 2. [CẬP NHẬT] Sắp xếp ưu tiên hiển thị (Quan trọng để Phó khoa hiện trước GV)
// Thứ tự trong mảng này quyết định cái nào được chọn hiển thị chính
const POSITION_ORDER = [
    'TRUONG_KHOA', 
    'PHO_TRUONG_KHOA', 
    'GIAO_VU',
    'TRUONG_BOMON', 
    'PHO_TRUONG_BOMON'
];

// Helper: Tìm chức vụ có thứ tự ưu tiên cao nhất
const getHighestPriorityPosition = (chucVus) => {
    if (!chucVus || chucVus.length === 0) return null;
    
    const codes = chucVus.map(cv => cv.MA_CHUCVU);
    
    // Duyệt theo thứ tự ưu tiên đã định nghĩa
    for (const code of POSITION_ORDER) {
        const found = chucVus.find(cv => cv.MA_CHUCVU === code);
        if (found) return found;
    }
    
    // Nếu có chức vụ nhưng không nằm trong list ưu tiên, lấy cái đầu tiên
    return chucVus[0];
}

const SortIndicator = ({ column }) => {
    const sorted = column.getIsSorted();
    if (!sorted) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sorted === "desc" ? <ArrowDown className="ml-2 h-4 w-4" /> : <ArrowUp className="ml-2 h-4 w-4" />;
};

const formatNgaySinh = (dateString) => {
    if (!dateString || dateString.startsWith('0000-00-00')) return null;
    try {
        let date = new Date(dateString);
        if (dateString.length === 10) {
             date = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
        }
        if (isValid(date)) {
            return format(date, 'dd/MM/yyyy');
        }
    } catch (e) {
        return null;
    }
    return null;
};

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
        size: 40,
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
                <Avatar className="h-9 w-9 border">
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
        ),
        minSize: 250,
    },
    {
        accessorKey: "MA_DINHDANH",
        header: "Mã định danh",
        cell: ({ row }) => (
            <div className="font-mono text-sm">
                {row.original.MA_DINHDANH}
            </div>
        ),
        size: 140,
    },
    {
        accessorKey: "NGAYSINH",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Ngày sinh
                <SortIndicator column={column} />
            </Button>
        ),
        cell: ({ row }) => {
            const ngaySinh = row.original.NGAYSINH;
            const formattedDate = formatNgaySinh(ngaySinh);
            if (!formattedDate) {
                return <span className="text-xs text-muted-foreground">Chưa có</span>;
            }
            return <div className="text-sm">{formattedDate}</div>;
        },
        size: 120,
    },
    {
        id: "vai_tro",
        accessorKey: "vaitro.TEN_VAITRO",
        header: "Vai trò / Chức vụ", // [UI] Đổi tiêu đề cột cho rõ nghĩa
        cell: ({ row }) => {
            const user = row.original;
            const roleName = user.vaitro.TEN_VAITRO;
            const chucVus = user.giangvien?.chucvus || [];

            // 1. Tìm chức vụ ưu tiên cao nhất
            const highestPosition = getHighestPriorityPosition(chucVus);
            
            // 2. Xác định tên hiển thị chính
            // Nếu có chức vụ cao (VD: Phó trưởng khoa), hiển thị nó. Nếu không, hiển thị Vai trò gốc (Giảng viên)
            let displayRoleName = roleName;
            let isPosition = false;

            if (highestPosition) {
                 displayRoleName = highestPosition.TEN_CHUCVU;
                 isPosition = true;
            }
            
            // 3. Chọn config (màu sắc, icon) dựa trên tên hiển thị
            // Fallback về config mặc định nếu không tìm thấy key
            const config = roleConfig[displayRoleName] || { icon: Briefcase, color: "bg-gray-100 text-gray-800" };
            const Icon = config.icon;

            return (
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge 
                                variant="outline" 
                                className={cn(
                                    'gap-1.5 text-xs py-0.5 cursor-default', 
                                    config.color,
                                    isPosition && 'border-dashed border-2' // Làm nổi bật nếu là chức vụ
                                )}
                            >
                                {Icon && <Icon className="h-3.5 w-3.5" />}
                                {displayRoleName}
                            </Badge>
                        </TooltipTrigger>
                        
                        {/* Tooltip hiển thị chi tiết tất cả chức vụ */}
                        {(chucVus.length > 0 || roleName !== displayRoleName) && (
                            <TooltipContent 
                                className="max-w-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-50 shadow-xl p-3 z-50"
                                side="top"
                            >
                                <p className="font-semibold mb-1 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Vai trò gốc
                                </p>
                                <p className="text-sm font-medium mb-2">
                                    {roleName}
                                </p>

                                {chucVus.length > 0 && (
                                    <>
                                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
                                        <p className="font-semibold mb-1 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Chức vụ kiêm nhiệm
                                        </p>
                                        <ul className="list-disc list-inside text-xs space-y-1">
                                            {chucVus.map((cv) => (
                                                <li 
                                                    key={cv.ID_CHUCVU} 
                                                    className={cn(
                                                        cv.ID_CHUCVU === highestPosition?.ID_CHUCVU 
                                                            ? "text-blue-600 dark:text-blue-400 font-bold"
                                                            : "text-slate-700 dark:text-slate-300"
                                                    )}
                                                >
                                                    {cv.TEN_CHUCVU}
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            );
        },
        minSize: 180,
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
                    <div className="text-xs text-muted-foreground font-medium">
                        {user.giangvien?.khoabomon?.TEN_KHOA_BOMON || 'N/A'}
                    </div>
                );
            }
            return (
                <div className="text-xs text-muted-foreground">N/A</div>
            );
        },
        minSize: 200,
    },
    // Các cột ẩn để phục vụ Filter
    {
        id: "chuyen_nganh_id",
        accessorFn: row => String(row.original?.sinhvien?.ID_CHUYENNGANH),
        enableHiding: false,
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
        id: "khoa_bomon_id",
        accessorFn: row => String(row.original?.giangvien?.ID_KHOA_BOMON),
        enableHiding: false,
        filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
        id: "chuc_vu_id",
        accessorFn: (row) => {
            const chucvus = row.original.giangvien?.chucvus || [];
            return chucvus.map(cv => String(cv.ID_CHUCVU));
        },
        enableHiding: false,
        filterFn: (row, id, value) => {
            const rowValues = row.getValue(id);
            return value.some((val) => rowValues.includes(val));
        },
    },
    {
        id: "trang_thai",
        accessorKey: "TRANGTHAI_KICHHOAT",
        header: "Trạng thái",
        cell: ({ row }) => {
            const isActive = row.getValue("trang_thai");
            return (
                <div className="flex items-center gap-2">
                    <Circle className={cn("h-2.5 w-2.5", isActive ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500')} />
                    <span className="text-muted-foreground text-xs">
                        {isActive ? "Hoạt động" : "Vô hiệu"}
                    </span>
                </div>
            );
        },
        size: 120,
        filterFn: (row, id, value) => {
            const rowValue = row.getValue(id) ? "1" : "0";
            return value.includes(rowValue);
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
        },
        size: 130,
    },
    {
        id: "actions",
        cell: ({ row }) => (
            <DataTableRowActions row={row} onEdit={onEdit} onSuccess={onSuccess} onViewDetails={onViewDetails} />
        ),
        size: 60,
    },
];