import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getAdminThesisPlanTemplates } from '@/api/thesisPlanService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { DataTable } from '@/components/shared/data-table/DataTable';
import { getColumns } from './components/columns';

export default function TemplateManagementPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Lấy danh sách bản mẫu từ API
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

  // Làm mới dữ liệu sau khi tạo/sửa/xóa
  const handleSuccess = () => {
    fetchData();
  };

  // Điều hướng đến trang tạo bản mẫu mới
  const handleOpenCreate = () => {
    navigate('/admin/templates/create');
  };

  // Điều hướng đến trang sửa bản mẫu
  const handleOpenEdit = (template) => {
    navigate(`/admin/templates/${template.ID_MAU}/edit`);
  };

  // Lọc danh sách bản mẫu theo từ khóa tìm kiếm
  const filteredTemplates = useMemo(() => {
    if (!searchTerm) return templates;
    return templates.filter(template =>
      template.TEN_MAU.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [templates, searchTerm]);

  // Tính toán phân trang và sắp xếp dữ liệu
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

        if (valA < valB) return desc ? 1 : -1;
        if (valA > valB) return desc ? -1 : 1;
      }
      return 0;
    });
    return sortedData.slice(start, end);
  }, [filteredTemplates, pagination, sorting]);

  // Lấy cấu hình cột cho bảng dữ liệu
  const columns = useMemo(() => getColumns({
    onEdit: handleOpenEdit,
    onSuccess: handleSuccess,
  }), [handleSuccess]);

  return (
    <div className="space-y-8 p-4 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Quản lý Kế hoạch Mẫu</h1>
        <Button onClick={handleOpenCreate}>
          <PlusCircle className="mr-2 h-4 w-4" /> Tạo Bản mẫu mới
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách Bản mẫu</CardTitle>
          <CardDescription>Các bản mẫu kế hoạch khóa luận có sẵn để sử dụng.</CardDescription>
        </CardHeader>
        <CardContent>
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
            searchPlaceholder="Tìm theo tên bản mẫu..."
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            addBtnText=""
          />
        </CardContent>
      </Card>
    </div>
  );
}