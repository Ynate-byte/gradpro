import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getAdminThesisPlanTemplates } from '@/api/thesisPlanService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileText } from 'lucide-react';
import { DataTable } from '@/components/shared/data-table/DataTable';
import { getColumns } from './components/columns';
import { motion, useReducedMotion } from 'framer-motion';
import { useTheme } from "@/components/theme-provider";

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
            hidden: { y: 20, opacity: 0 },
            visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
        }
    };
};

export default function TemplateManagementPage() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [sorting, setSorting] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const shouldReduceMotion = useReducedMotion();
    const { reduceMotion } = useTheme();
    const isReduced = reduceMotion || shouldReduceMotion;
    const variants = useMemo(() => getVariants(isReduced), [isReduced]);

    const fetchData = useCallback(() => {
        setLoading(true);
        getAdminThesisPlanTemplates()
            .then(response => {
                setTemplates(response || []);
            })
            .catch(() => toast.error("Lỗi khi tải danh sách bản mẫu."))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSuccess = () => {
        fetchData();
    };

    const handleOpenCreate = () => navigate('/admin/templates/create');
    const handleOpenEdit = (template) => navigate(`/admin/templates/${template.ID_MAU}/edit`);

    const filteredTemplates = useMemo(() => {
        if (!searchTerm) return templates;
        return templates.filter(template =>
            template.TEN_MAU.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [templates, searchTerm]);

    // Tính toán phân trang và sắp xếp dữ liệu (Client-side pagination)
    const pageCount = Math.ceil(filteredTemplates.length / pagination.pageSize);
    const paginatedData = useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        const end = start + pagination.pageSize;
        const sortedData = [...filteredTemplates].sort((a, b) => {
            if (sorting.length > 0) {
                const { id, desc } = sorting[0];
                const valA = id.split('.').reduce((o, i) => (o ? o[i] : undefined), a);
                const valB = id.split('.').reduce((o, i) => (o ? o[i] : undefined), b);

                if (valA == null) return 1;
                if (valB == null) return -1;

                if (typeof valA === 'number' && typeof valB === 'number') {
                    return desc ? valB - valA : valA - valB;
                }
                if (typeof valA === 'string' && typeof valB === 'string') {
                    return desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
                }
            }
            return 0;
        });
        return sortedData.slice(start, end);
    }, [filteredTemplates, pagination, sorting]);

    const columns = useMemo(() => getColumns({
        onEdit: handleOpenEdit,
        onSuccess: handleSuccess,
    }), [handleSuccess]);

    return (
        <motion.div 
            className="h-full flex flex-col space-y-4 p-4 md:p-8 overflow-hidden"
            initial="hidden"
            animate="visible"
            variants={variants.container}
        >
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                         <FileText className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Bản mẫu Kế hoạch</h1>
                        <p className="text-sm text-muted-foreground">Quản lý các khuôn mẫu có sẵn để tạo nhanh kế hoạch mới.</p>
                    </div>
                </div>
                <Button onClick={handleOpenCreate} className="shadow-sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Tạo Bản mẫu mới
                </Button>
            </div>

            {/* Table Container */}
            <motion.div 
                className="flex-1 min-h-0 flex flex-col"
                variants={variants.item}
            >
                <Card className="flex-1 flex flex-col min-h-0 border-border/60 shadow-sm bg-card">
                    <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                        <div className="flex-1 min-h-0">
                            <DataTable
                                columns={columns}
                                data={paginatedData}
                                pageCount={pageCount}
                                loading={loading}
                                pagination={pagination}
                                setPagination={setPagination}
                                columnFilters={[]}
                                setColumnFilters={() => {}}
                                sorting={sorting}
                                setSorting={setSorting}
                                manualPagination={false}
                                manualFiltering={false}
                                manualSorting={false}
                                onAddUser={null}
                                onImportUser={null}
                                searchColumnId="TEN_MAU"
                                searchPlaceholder="Tìm theo tên bản mẫu..."
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                                addBtnText=""
                                flexLayout={true}
                                containerClassName="h-full border-none shadow-none"
                                className="h-full"
                            />
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}