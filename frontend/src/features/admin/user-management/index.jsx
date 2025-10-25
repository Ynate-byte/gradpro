import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getColumns } from './components/columns';
import { DataTable } from '@/components/shared/data-table/DataTable';
import { getUsers, getChuyenNganhs, getKhoaBomons } from '@/api/userService';
import { UserFormDialog } from './components/user-form-dialog';
import { UserImportDialog } from './components/UserImportDialog';
import { UserDetailSheet } from './components/UserDetailSheet';
import { Toaster, toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, GraduationCap, Briefcase, ShieldCheck, Circle, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

// Component StatCard với animation mượt mà
const StatCard = ({ icon: Icon, title, value, description, iconBgClass = "bg-primary/10", iconColorClass = "text-primary", hasStatusDot }) => (
    <motion.div 
        className="bg-card text-card-foreground p-2 rounded-lg shadow-sm border flex items-center gap-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1"
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
        <motion.div 
            className={cn("p-3 rounded-lg", iconBgClass)}
            initial={false}
            animate={{ 
                scale: value === 'loading' ? [1, 1.08, 1] : 1,
                rotate: value === 'loading' ? [0, 5, -5, 0] : 0
            }}
            transition={{ 
                duration: 2, 
                repeat: value === 'loading' ? Infinity : 0,
                ease: "easeInOut"
            }}
        >
            <Icon className={cn("h-6 w-6", iconColorClass)} />
        </motion.div>
        <div className="flex-1">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <div className="flex items-center gap-2 h-8 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={value}
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.8 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="flex items-center gap-2"
                    >
                        {value === 'loading' ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                        ) : (
                            <>
                                <p className="text-2xl font-bold">{value}</p>
                                {hasStatusDot && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2, type: "spring" }}
                                    >
                                        <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500 animate-pulse" />
                                    </motion.div>
                                )}
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
            {description && (
                <motion.p 
                    className="text-xs text-muted-foreground mt-0.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    {description}
                </motion.p>
            )}
        </div>
    </motion.div>
);

// Animation variants nâng cao
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.05
        }
    }
};

const itemVariants = {
    hidden: { 
        y: 30, 
        opacity: 0,
        scale: 0.95
    },
    visible: { 
        y: 0, 
        opacity: 1,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 15
        }
    }
};

const tableVariants = {
    hidden: { 
        opacity: 0, 
        y: 30,
        scale: 0.98
    },
    visible: { 
        opacity: 1, 
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 80,
            damping: 18,
            duration: 0.5
        }
    },
    exit: { 
        opacity: 0, 
        y: -30,
        scale: 0.98,
        transition: {
            duration: 0.3
        }
    }
};

// Cấu hình ẩn cột
const userColumnVisibility = {
    chuyen_nganh: false,
    khoa_bomon: false,
    chuyen_nganh_id: false,
    khoa_bomon_id: false,
};

export default function UserManagementPage() {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [pageCount, setPageCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingStats, setLoadingStats] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [viewingUserId, setViewingUserId] = useState(null);
    const [activeTab, setActiveTab] = useState("Tất cả");
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [columnFilters, setColumnFilters] = useState([]);
    const [sorting, setSorting] = useState([]);
    const [chuyenNganhOptions, setChuyenNganhOptions] = useState([]);
    const [khoaBomonOptions, setKhoaBomonOptions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [rowSelection, setRowSelection] = useState({});
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // Fetch Chuyên ngành và Khoa/Bộ môn
    useEffect(() => {
        Promise.all([
            getChuyenNganhs().catch(() => []),
            getKhoaBomons().catch(() => [])
        ]).then(([chuyenNganhs, khoaBomons]) => {
            setChuyenNganhOptions(chuyenNganhs);
            setKhoaBomonOptions(khoaBomons);
        });
    }, []);

    // Fetch danh sách người dùng
    const fetchData = useCallback((isInitialLoad = false) => {
        if (isInitialLoad || activeTab || columnFilters.length > 0 || debouncedSearchTerm) {
            setLoadingStats(true);
        }
        setLoading(true);

        const params = {
            page: pagination.pageIndex + 1,
            per_page: pagination.pageSize,
            search: debouncedSearchTerm,
            role: activeTab === "Tất cả" ? undefined : activeTab,
            statuses: columnFilters.find(f => f.id === 'trang_thai')?.value,
            chuyen_nganh_ids: columnFilters.find(f => f.id === 'chuyen_nganh_id')?.value,
            khoa_bomon_ids: columnFilters.find(f => f.id === 'khoa_bomon_id')?.value,
            sort: sorting[0] ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : undefined,
        };
        getUsers(params)
            .then(response => {
                setData(response.data);
                setPageCount(response.last_page);
                setTotal(response.total);
            })
            .catch(error => toast.error("Lỗi khi tải dữ liệu người dùng."))
            .finally(() => {
                 setLoading(false);
                 setLoadingStats(false);
            });
    }, [pagination, columnFilters, sorting, activeTab, debouncedSearchTerm]);

    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    const handleFormSuccess = () => fetchData(true);
    const handleOpenCreateDialog = () => { setEditingUser(null); setIsDialogOpen(true); };
    const handleOpenEditDialog = (user) => { setEditingUser(user); setIsDialogOpen(true); };
    const handleOpenViewSheet = (user) => {
        setViewingUserId(user.ID_NGUOIDUNG);
        setIsSheetOpen(true);
    };

    const columns = useMemo(() => getColumns({
        onEdit: handleOpenEditDialog,
        onSuccess: handleFormSuccess,
        onViewDetails: handleOpenViewSheet
    }), [handleFormSuccess]);

    // Reset phân trang khi filter/search/tab thay đổi
    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [activeTab, columnFilters, debouncedSearchTerm]);

    // Thống kê động từ dữ liệu
    const totalStudents = useMemo(() => loadingStats ? 'loading' : data.filter(u => u.vaitro.TEN_VAITRO === 'Sinh viên').length, [data, loadingStats]);
    const totalLecturers = useMemo(() => loadingStats ? 'loading' : data.filter(u => ['Giảng viên', 'Giáo vụ', 'Trưởng khoa'].includes(u.vaitro.TEN_VAITRO)).length, [data, loadingStats]);
    const activeUsers = useMemo(() => loadingStats ? 'loading' : data.filter(u => u.TRANGTHAI_KICHHOAT).length, [data, loadingStats]);

    // Options cho bộ lọc
    const chuyenNganhFilterOptions = useMemo(() =>
        (chuyenNganhOptions || []).map(cn => ({ label: cn.TEN_CHUYENNGANH, value: String(cn.ID_CHUYENNGANH) })),
        [chuyenNganhOptions]
    );
    const khoaBomonFilterOptions = useMemo(() =>
        (khoaBomonOptions || []).map(kb => ({ label: kb.TEN_KHOA_BOMON, value: String(kb.ID_KHOA_BOMON) })),
        [khoaBomonOptions]
    );

    // Hàm render DataTable cho các tab với smooth reveal animation
    const renderDataTable = (tabName) => {
        const [tableHeight, setTableHeight] = useState('auto');
        const tableRef = React.useRef(null);

        React.useLayoutEffect(() => {
            if (tableRef.current) {
                const height = tableRef.current.getBoundingClientRect().height;
                setTableHeight(height);
            }
        }, [data, loading, tabName]);

        return (
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
                        key={tabName}
                        columns={columns}
                        data={data}
                        pageCount={pageCount}
                        loading={loading}
                        pagination={pagination}
                        setPagination={setPagination}
                        columnFilters={columnFilters}
                        setColumnFilters={setColumnFilters}
                        sorting={sorting}
                        setSorting={setSorting}
                        onAddUser={handleOpenCreateDialog}
                        onImportUser={() => setIsImportOpen(true)}
                        chuyenNganhFilterColumnId="chuyen_nganh_id"
                        chuyenNganhFilterOptions={(tabName === 'Tất cả' || tabName === 'Sinh viên') ? chuyenNganhFilterOptions : undefined}
                        khoaBomonFilterColumnId="khoa_bomon_id"
                        khoaBomonFilterOptions={(tabName === 'Tất cả' || ['Giảng viên', 'Giáo vụ', 'Trưởng khoa'].includes(tabName)) ? khoaBomonFilterOptions : undefined}
                        searchColumnId="HODEM_VA_TEN"
                        searchPlaceholder="Tìm theo tên, email, mã..."
                        addBtnText="Thêm người dùng"
                        statusColumnId="trang_thai"
                        statusOptions={[{ value: "1", label: "Hoạt động" }, { value: "0", label: "Vô hiệu" }]}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        columnVisibility={userColumnVisibility}
                        state={{ rowSelection, sorting, columnFilters, pagination, columnVisibility: userColumnVisibility }}
                        onRowSelectionChange={setRowSelection}
                        onSuccess={handleFormSuccess}
                    />
                </div>
            </motion.div>
        );
    };

    return (
        <>
            <motion.div 
                className="flex-1 space-y-6 p-4 md:p-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                {/* Stats Cards */}
                <motion.div
                    className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div variants={itemVariants}>
                        <StatCard 
                            icon={Users} 
                            title="Tổng số" 
                            value={loadingStats ? 'loading' : total.toLocaleString('vi-VN')} 
                            description="tài khoản trong hệ thống" 
                            iconBgClass="bg-blue-100 dark:bg-blue-900/30" 
                            iconColorClass="text-blue-600 dark:text-blue-400" 
                        />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <StatCard 
                            icon={GraduationCap} 
                            title="Sinh viên" 
                            value={totalStudents} 
                            description="trên trang này" 
                            iconBgClass="bg-sky-100 dark:bg-sky-900/30" 
                            iconColorClass="text-sky-600 dark:text-sky-400"
                        />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <StatCard 
                            icon={Briefcase} 
                            title="Giảng viên & CV" 
                            value={totalLecturers} 
                            description="trên trang này" 
                            iconBgClass="bg-indigo-100 dark:bg-indigo-900/30" 
                            iconColorClass="text-indigo-600 dark:text-indigo-400"
                        />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <StatCard 
                            icon={ShieldCheck} 
                            title="Đang hoạt động" 
                            value={activeUsers} 
                            description="trên trang này" 
                            iconBgClass="bg-green-100 dark:bg-green-900/30" 
                            iconColorClass="text-green-600 dark:text-green-400" 
                            hasStatusDot={true}
                        />
                    </motion.div>
                </motion.div>

                {/* Tabs và DataTable */}
                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ 
                        duration: 0.5, 
                        delay: 0.3,
                        type: "spring",
                        stiffness: 100
                    }}
                >
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            <TabsList className="transition-all duration-300">
                                <TabsTrigger value="Tất cả" className="transition-all duration-200">Tất cả</TabsTrigger>
                                <TabsTrigger value="Sinh viên" className="transition-all duration-200">Sinh viên</TabsTrigger>
                                <TabsTrigger value="Giảng viên" className="transition-all duration-200">Giảng viên</TabsTrigger>
                                <TabsTrigger value="Giáo vụ" className="transition-all duration-200">Giáo vụ</TabsTrigger>
                                <TabsTrigger value="Trưởng khoa" className="transition-all duration-200">Trưởng khoa</TabsTrigger>
                            </TabsList>
                        </motion.div>
                        <TabsContent value={activeTab} className="mt-0 outline-none ring-0">
                             {renderDataTable(activeTab)}
                        </TabsContent>
                    </Tabs>
                </motion.div>
            </motion.div>

            {/* Dialogs và Sheet với animation */}
            <AnimatePresence>
                {isDialogOpen && (
                    <UserFormDialog
                        isOpen={isDialogOpen}
                        setIsOpen={setIsDialogOpen}
                        editingUser={editingUser}
                        onSuccess={handleFormSuccess}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isImportOpen && (
                    <UserImportDialog
                        isOpen={isImportOpen}
                        setIsOpen={setIsImportOpen}
                        onSuccess={handleFormSuccess}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {isSheetOpen && (
                    <UserDetailSheet
                        userId={viewingUserId}
                        isOpen={isSheetOpen}
                        setIsOpen={setIsSheetOpen}
                    />
                )}
            </AnimatePresence>
            <Toaster richColors position="top-right" />
        </>
    );
}