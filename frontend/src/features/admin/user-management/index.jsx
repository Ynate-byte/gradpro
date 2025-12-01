import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { getColumns } from './components/columns';
import { DataTable } from '@/components/shared/data-table/DataTable';
import { getUsers, getChuyenNganhs, getKhoaBomons, getPositions } from '@/api/userService';
import { UserFormDialog } from './components/user-form-dialog';
import { UserImportDialog } from './components/UserImportDialog';
import { UserDetailSheet } from './components/UserDetailSheet';
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, GraduationCap, Briefcase, ShieldCheck } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { useTheme } from "@/components/theme-provider";
// [QUAN TRỌNG] Import StatCard xịn từ Shared component
import StatCard from '@/components/shared/StatCard'; 

// Animation variants
const getVariants = (shouldReduce) => {
    if (shouldReduce) {
        return {
            container: { visible: { opacity: 1 } },
            item: { visible: { opacity: 1, y: 0, scale: 1 } },
        };
    }
    return {
        container: {
            hidden: { opacity: 0 },
            visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1, delayChildren: 0.05 }
            }
        },
        item: {
            hidden: { y: 20, opacity: 0, scale: 0.95 },
            visible: { 
                y: 0, opacity: 1, scale: 1,
                transition: { type: "spring", stiffness: 100, damping: 15 }
            }
        }
    };
};

const userColumnVisibility = {
    chuyen_nganh: false,
    khoa_bomon: false,
    chuyen_nganh_id: false,
    khoa_bomon_id: false,
    chuc_vu_id: false,
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
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
    const [columnFilters, setColumnFilters] = useState([]);
    const [sorting, setSorting] = useState([]);
    const [chuyenNganhOptions, setChuyenNganhOptions] = useState([]);
    const [khoaBomonOptions, setKhoaBomonOptions] = useState([]);
    const [positionOptions, setPositionOptions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [rowSelection, setRowSelection] = useState({});
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const shouldReduceMotion = useReducedMotion();
    const { reduceMotion } = useTheme(); 
    const isReduced = reduceMotion || shouldReduceMotion;
    const variants = useMemo(() => getVariants(isReduced), [isReduced]);

    // 1. Fetch Options
    useEffect(() => {
        Promise.all([
            getChuyenNganhs().catch(() => []),
            getKhoaBomons().catch(() => []),
            getPositions().catch(() => []), 
        ]).then(([chuyenNganhs, khoaBomons, positions]) => {
            setChuyenNganhOptions(chuyenNganhs);
            setKhoaBomonOptions(khoaBomons);
            setPositionOptions(positions.map(p => ({ label: p.TEN_CHUCVU, value: String(p.ID_CHUCVU) })));
        })
        .catch(() => toast.error("Lỗi khi tải các tùy chọn lọc."));
    }, []);

    // 2. Fetch Data
    const fetchData = useCallback((isInitialLoad = false) => {
        if (isInitialLoad || activeTab || columnFilters.length > 0 || debouncedSearchTerm) {
            setLoadingStats(true);
        }
        setLoading(true);

        let roleFilter = undefined;
        let positionFilterIds = undefined;
        const manualPositionFilter = columnFilters.find(f => f.id === 'chuc_vu_id')?.value;

        if (activeTab === "Sinh viên") roleFilter = "Sinh viên";
        else if (activeTab === "Giảng viên") roleFilter = "Giảng viên";
        else if (activeTab === "Giáo vụ") {
            const gvOption = positionOptions.find(p => p.label.toLowerCase().includes('giáo vụ'));
            if (gvOption) positionFilterIds = [gvOption.value]; 
        } else if (activeTab === "Trưởng khoa") {
            const tkOption = positionOptions.find(p => p.label.toLowerCase().includes('trưởng khoa'));
            if (tkOption) positionFilterIds = [tkOption.value];
        }

        if (manualPositionFilter && manualPositionFilter.length > 0) {
            if (!positionFilterIds) positionFilterIds = manualPositionFilter;
        }
        
        const params = {
            page: pagination.pageIndex + 1,
            per_page: pagination.pageSize,
            search: debouncedSearchTerm,
            role: roleFilter,
            statuses: columnFilters.find(f => f.id === 'trang_thai')?.value,
            chuyen_nganh_ids: columnFilters.find(f => f.id === 'chuyen_nganh_id')?.value,
            khoa_bomon_ids: columnFilters.find(f => f.id === 'khoa_bomon_id')?.value,
            position_ids: positionFilterIds,
            sort: sorting[0] ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : undefined,
        };
        
        getUsers(params)
            .then(response => {
                setData(response.data);
                setPageCount(response.last_page);
                setTotal(response.total);
            })
            .catch(error => toast.error("Lỗi khi tải dữ liệu."))
            .finally(() => {
                setLoading(false);
                setLoadingStats(false);
            });
    }, [pagination, columnFilters, sorting, activeTab, debouncedSearchTerm, positionOptions]);

    useEffect(() => {
        if (positionOptions.length > 0 || ['Tất cả','Sinh viên','Giảng viên'].includes(activeTab)) {
             fetchData(true);
        }
    }, [fetchData, positionOptions.length]);

    const handleFormSuccess = () => fetchData(true);
    const handleOpenCreateDialog = () => { setEditingUser(null); setIsDialogOpen(true); };
    const handleOpenEditDialog = (user) => { setEditingUser(user); setIsDialogOpen(true); };
    const handleOpenViewSheet = (user) => { setViewingUserId(user.ID_NGUOIDUNG); setIsSheetOpen(true); };

    const columns = useMemo(() => getColumns({
        onEdit: handleOpenEditDialog,
        onSuccess: handleFormSuccess,
        onViewDetails: handleOpenViewSheet
    }), [handleFormSuccess]);

    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [activeTab, columnFilters, debouncedSearchTerm]);

    // Stats Logic
    const totalStudents = useMemo(() => loadingStats ? 'loading' : (activeTab === 'Sinh viên' ? total.toLocaleString('vi-VN') : '...'), [activeTab, total, loadingStats]);
    const totalLecturers = useMemo(() => loadingStats ? 'loading' : data.filter(u => ['Giảng viên', 'Giáo vụ', 'Trưởng khoa'].includes(u.vaitro?.TEN_VAITRO)).length, [data, loadingStats]);
    const activeUsers = useMemo(() => loadingStats ? 'loading' : data.filter(u => u.TRANGTHAI_KICHHOAT).length, [data, loadingStats]);

    // Filter Options Logic
    const chuyenNganhFilterOptions = useMemo(() => (chuyenNganhOptions || []).map(cn => ({ label: cn.TEN_CHUYENNGANH, value: String(cn.ID_CHUYENNGANH) })), [chuyenNganhOptions]);
    const khoaBomonFilterOptions = useMemo(() => (khoaBomonOptions || []).map(kb => ({ label: kb.TEN_KHOA_BOMON, value: String(kb.ID_KHOA_BOMON) })), [khoaBomonOptions]);

    // Render Table
    const renderDataTable = (tabName) => {
        return (
            <div className="flex-1 min-h-0 h-full"> 
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
                    flexLayout={true} 
                    containerClassName="h-full border-none shadow-none"
                    
                    // Toolbar props
                    onAddUser={handleOpenCreateDialog}
                    onImportUser={() => setIsImportOpen(true)}
                    addBtnText="Thêm mới"
                    searchColumnId="HODEM_VA_TEN"
                    searchPlaceholder="Tìm kiếm..."
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    
                    // Filters
                    statusColumnId="trang_thai"
                    statusOptions={[{ value: "1", label: "Hoạt động" }, { value: "0", label: "Vô hiệu" }]}
                    chuyenNganhFilterColumnId="chuyen_nganh_id"
                    chuyenNganhFilterOptions={(tabName === 'Tất cả' || tabName === 'Sinh viên') ? chuyenNganhFilterOptions : undefined}
                    khoaBomonFilterColumnId="khoa_bomon_id"
                    khoaBomonFilterOptions={(tabName === 'Tất cả' || ['Giảng viên', 'Giáo vụ', 'Trưởng khoa'].includes(tabName)) ? khoaBomonFilterOptions : undefined}
                    chucVuFilterColumnId="chuc_vu_id" 
                    chucVuFilterOptions={(tabName === 'Tất cả' || tabName === 'Giảng viên') ? positionOptions : undefined}
                    
                    columnVisibility={userColumnVisibility}
                    state={{ rowSelection, sorting, columnFilters, pagination, columnVisibility: userColumnVisibility }}
                    onRowSelectionChange={setRowSelection}
                    onSuccess={handleFormSuccess}
                />
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col p-6 gap-4">
            <motion.div 
                className="flex-none grid gap-4 grid-cols-2 lg:grid-cols-4"
                variants={variants.container}
                initial="hidden"
                animate="visible"
            >
                <motion.div variants={variants.item} className="h-full">
                    <StatCard 
                        icon={Users} title="Tổng số" 
                        value={loadingStats ? 'loading' : total.toLocaleString('vi-VN')} 
                        description="tài khoản" 
                        iconBgClass="bg-blue-100 dark:bg-blue-900/30" iconColorClass="text-blue-600 dark:text-blue-400" 
                        isLoading={loadingStats} // Truyền prop isLoading
                    />
                </motion.div>
                <motion.div variants={variants.item} className="h-full">
                    <StatCard 
                        icon={GraduationCap} title="Sinh viên" 
                        value={totalStudents} description="trang hiện tại" 
                        iconBgClass="bg-sky-100 dark:bg-sky-900/30" iconColorClass="text-sky-600 dark:text-sky-400" 
                        isLoading={loadingStats}
                    />
                </motion.div>
                <motion.div variants={variants.item} className="h-full">
                    <StatCard 
                        icon={Briefcase} title="Cán bộ" 
                        value={totalLecturers} description="Giảng viên & CV" 
                        iconBgClass="bg-indigo-100 dark:bg-indigo-900/30" iconColorClass="text-indigo-600 dark:text-indigo-400" 
                        isLoading={loadingStats}
                    />
                </motion.div>
                <motion.div variants={variants.item} className="h-full">
                    <StatCard 
                        icon={ShieldCheck} title="Hoạt động" 
                        value={activeUsers} description="trang hiện tại" 
                        iconBgClass="bg-green-100 dark:bg-green-900/30" iconColorClass="text-green-600 dark:text-green-400" 
                        hasStatusDot={true}
                        isLoading={loadingStats}
                    />
                </motion.div>
            </motion.div>

            {/* Tabs & Table */}
            <div className="flex-1 min-h-0 flex flex-col bg-card rounded-lg border shadow-sm">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                    <div className="px-4 pt-4 pb-2 border-b">
                        <TabsList className="bg-muted/50">
                            <TabsTrigger value="Tất cả">Tất cả</TabsTrigger>
                            <TabsTrigger value="Sinh viên">Sinh viên</TabsTrigger>
                            <TabsTrigger value="Giảng viên">Giảng viên</TabsTrigger>
                            <TabsTrigger value="Giáo vụ">Giáo vụ</TabsTrigger>
                            <TabsTrigger value="Trưởng khoa">Trưởng khoa</TabsTrigger>
                        </TabsList>
                    </div>
                    
                    <div className="flex-1 min-h-0 p-4 pt-2">
                        {['Tất cả', 'Sinh viên', 'Giảng viên', 'Giáo vụ', 'Trưởng khoa'].map(tab => (
                            <TabsContent key={tab} value={tab} className="h-full mt-0 border-0 p-0 data-[state=active]:flex flex-col">
                                {activeTab === tab && renderDataTable(tab)}
                            </TabsContent>
                        ))}
                    </div>
                </Tabs>
            </div>

            {/* Dialogs */}
            <AnimatePresence>
                {isDialogOpen && <UserFormDialog isOpen={isDialogOpen} setIsOpen={setIsDialogOpen} editingUser={editingUser} onSuccess={handleFormSuccess} />}
            </AnimatePresence>
            <AnimatePresence>
                {isImportOpen && <UserImportDialog isOpen={isImportOpen} setIsOpen={setIsImportOpen} onSuccess={handleFormSuccess} />}
            </AnimatePresence>
            <AnimatePresence>
                {isSheetOpen && <UserDetailSheet userId={viewingUserId} isOpen={isSheetOpen} setIsOpen={setIsSheetOpen} />}
            </AnimatePresence>
        </div>
    );
}