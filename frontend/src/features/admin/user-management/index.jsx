import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { getColumns } from './components/columns';
import { DataTable } from './components/data-table';
import { getUsers, getChuyenNganhs, getKhoaBomons } from '@/api/userService';
import { UserFormDialog } from './components/user-form-dialog';
import { UserImportDialog } from './components/UserImportDialog';
import { UserDetailSheet } from './components/UserDetailSheet';
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster, toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, GraduationCap, Briefcase, ShieldCheck } from 'lucide-react';

const StatCard = ({ icon: Icon, title, value, description }) => (
    <div className="bg-card text-card-foreground p-4 rounded-lg shadow-sm border flex items-center gap-4">
        <div className="bg-primary/10 p-3 rounded-md">
            <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <p className="text-2xl font-bold">{value}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
    </div>
);

const DataTableSkeleton = () => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-[250px]" />
            <Skeleton className="h-8 w-[170px]" />
        </div>
        <div className="rounded-md border">
            <div className="p-4 border-b"><Skeleton className="h-5 w-[80%]" /></div>
            <div className="p-4 space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (<Skeleton key={i} className="h-5 w-full" />))}
            </div>
        </div>
        <div className="flex items-center justify-between p-4 border-t"><Skeleton className="h-8 w-[150px]" /><Skeleton className="h-8 w-[200px]" /></div>
    </div>
);

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
};

export default function UserManagementPage() {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [pageCount, setPageCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [viewingUser, setViewingUser] = useState(null);
    const [activeTab, setActiveTab] = useState("Tất cả");
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [columnFilters, setColumnFilters] = useState([]);
    const [sorting, setSorting] = useState([]);
    const [filterOptions, setFilterOptions] = useState({ chuyenNganhs: [], khoaBomons: [] });

    useEffect(() => {
        Promise.all([
            getChuyenNganhs().catch(() => []),
            getKhoaBomons().catch(() => [])
        ]).then(([chuyenNganhs, khoaBomons]) => {
            setFilterOptions({ chuyenNganhs, khoaBomons });
        });
    }, []);

    const fetchData = useCallback(() => {
        setLoading(true);
        const params = {
            page: pagination.pageIndex + 1,
            per_page: pagination.pageSize,
            search: columnFilters.find(f => f.id === 'HODEM_VA_TEN')?.value,
            role: activeTab === "Tất cả" ? undefined : activeTab,
            statuses: columnFilters.find(f => f.id === 'trang_thai')?.value?.map(s => s === '1' ? 1 : 0),
            chuyen_nganh_ids: columnFilters.find(f => f.id === 'chuyen_nganh')?.value,
            khoa_bomon_ids: columnFilters.find(f => f.id === 'khoa_bomon')?.value,
            sort: sorting[0] ? `${sorting[0].id},${sorting[0].desc ? 'desc' : 'asc'}` : undefined,
        };
        getUsers(params)
            .then(response => {
                setData(response.data);
                setPageCount(response.last_page);
                setTotal(response.total);
            })
            .catch(error => toast.error("Lỗi khi tải dữ liệu người dùng."))
            .finally(() => setLoading(false));
    }, [pagination, columnFilters, sorting, activeTab]);

    useEffect(() => {
        const timer = setTimeout(() => fetchData(), 300);
        return () => clearTimeout(timer);
    }, [fetchData]);

    const handleOpenCreateDialog = () => { setEditingUser(null); setIsDialogOpen(true); };
    const handleOpenEditDialog = (user) => { setEditingUser(user); setIsDialogOpen(true); };
    const handleFormSuccess = () => fetchData();
    const handleOpenViewSheet = (user) => {
        setViewingUser(user);
        setIsSheetOpen(true);
    };

    const columns = useMemo(() => getColumns({
        onEdit: handleOpenEditDialog,
        onSuccess: handleFormSuccess,
        onViewDetails: handleOpenViewSheet
    }), []);
    
    useEffect(() => {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, [activeTab, columnFilters]);

    const totalStudents = data.filter(u => u.vaitro.TEN_VAITRO === 'Sinh viên').length;
    const totalLecturers = data.filter(u => u.vaitro.TEN_VAITRO === 'Giảng viên').length;
    const activeUsers = data.filter(u => u.TRANGTHAI_KICHHOAT).length;

    const renderDataTable = (tabName) => (
        loading ? <DataTableSkeleton /> :
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
            filterOptions={filterOptions}
            activeTab={activeTab}
            onSuccess={handleFormSuccess}
        />
    );

    return (
        <>
            <div className="hidden h-full flex-1 flex-col space-y-8 p-8 md:flex">
                <motion.div
                    className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div variants={itemVariants}><StatCard icon={Users} title="Tổng số" value={total.toLocaleString('vi-VN')} description="tài khoản trong hệ thống" /></motion.div>
                    <motion.div variants={itemVariants}><StatCard icon={GraduationCap} title="Sinh viên" value={totalStudents.toLocaleString('vi-VN')} description="trên trang này" /></motion.div>
                    <motion.div variants={itemVariants}><StatCard icon={Briefcase} title="Giảng viên" value={totalLecturers.toLocaleString('vi-VN')} description="trên trang này" /></motion.div>
                    <motion.div variants={itemVariants}><StatCard icon={ShieldCheck} title="Đang hoạt động" value={activeUsers.toLocaleString('vi-VN')} description="trên trang này" /></motion.div>
                </motion.div>

                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="Tất cả">Tất cả</TabsTrigger>
                            <TabsTrigger value="Sinh viên">Sinh viên</TabsTrigger>
                            <TabsTrigger value="Giảng viên">Giảng viên</TabsTrigger>
                        </TabsList>
                        <TabsContent value="Tất cả" className="mt-0">{renderDataTable("Tất cả")}</TabsContent>
                        <TabsContent value="Sinh viên" className="mt-0">{renderDataTable("Sinh viên")}</TabsContent>
                        <TabsContent value="Giảng viên" className="mt-0">{renderDataTable("Giảng viên")}</TabsContent>
                    </Tabs>
                </motion.div>
            </div>
            
            <UserFormDialog isOpen={isDialogOpen} setIsOpen={setIsDialogOpen} editingUser={editingUser} onSuccess={handleFormSuccess} />
            <UserImportDialog isOpen={isImportOpen} setIsOpen={setIsImportOpen} onSuccess={handleFormSuccess} />
            <UserDetailSheet user={viewingUser} isOpen={isSheetOpen} setIsOpen={setIsSheetOpen} />
            <Toaster richColors position="top-right" />
        </>
    );
}