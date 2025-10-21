import React, { useState, useEffect, useCallback } from 'react';
// Import API functions (no changes needed here)
import { findGroups, requestToJoin, getMyActivePlans } from '@/api/groupService';
import { getChuyenNganhs, getKhoaBomons } from '@/api/userService';
// Form and validation (no changes needed here)
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
// Import UI components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UserPlus, CheckCircle, BookCopy } from 'lucide-react';
// Import Table components
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"; // <-- Add this line

// RequestJoinDialog remains the same
const requestSchema = z.object({ LOINHAN: z.string().max(150, 'Lời nhắn không quá 150 ký tự.').optional() });

const RequestJoinDialog = ({ group, isOpen, setIsOpen, onSuccess }) => {
    // ... (Dialog component code remains unchanged) ...
    const [isLoading, setIsLoading] = useState(false);
    const form = useForm({
        resolver: zodResolver(requestSchema),
        defaultValues: { LOINHAN: '' },
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            const response = await requestToJoin(group.ID_NHOM, data);
            toast.success(response.message);
            onSuccess();
            setIsOpen(false);
            form.reset(); // Reset form after successful submission
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gửi yêu cầu thất bại.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!group) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Gửi yêu cầu gia nhập "{group.TEN_NHOM}"</DialogTitle>
                    <DialogDescription>Gửi lời nhắn (tùy chọn) đến nhóm trưởng.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="LOINHAN"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Lời nhắn</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Chào bạn, mình muốn tham gia nhóm..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Gửi
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};


export default function FindGroupPage() {
    const [groups, setGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', ID_CHUYENNGANH: '', ID_KHOA_BOMON: '' });
    const [options, setOptions] = useState({ chuyenNganhs: [], khoaBomons: [], activePlans: [] });
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [selectedGroup, setSelectedGroup] = useState(null); // For the dialog

    // fetchPrerequisites and useEffect for initial data remain the same
    const fetchPrerequisites = useCallback(async () => {
        try {
            const [cn, kb, plans] = await Promise.all([getChuyenNganhs(), getKhoaBomons(), getMyActivePlans()]);
            setOptions({ chuyenNganhs: cn, khoaBomons: kb, activePlans: plans });
            if (plans.length > 0) {
                setSelectedPlanId(String(plans[0].ID_KEHOACH));
            } else {
                setIsLoading(false); // Stop loading if no plans
            }
        } catch {
            toast.error("Lỗi tải dữ liệu ban đầu.");
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPrerequisites();
    }, [fetchPrerequisites]);

    // fetchData and useEffect for fetching groups based on filters remain the same
    const fetchData = useCallback(async () => {
        if (!selectedPlanId) return; // Don't fetch if no plan is selected
        setIsLoading(true);
        try {
            const res = await findGroups(filters, selectedPlanId);
            setGroups(res.data); // Assuming res.data is the array of groups
        } catch (error) {
            toast.error("Tải danh sách nhóm thất bại.");
            setGroups([]); // Clear groups on error
        } finally {
            setIsLoading(false);
        }
    }, [filters, selectedPlanId]);

    useEffect(() => {
        // Debounce fetching data when filters change
        const timer = setTimeout(() => {
            fetchData();
        }, 300); // Adjust delay as needed
        return () => clearTimeout(timer);
    }, [fetchData]); // Rerun when fetchData function changes (due to filters or selectedPlanId)

    // handleFilterChange remains the same
    const handleFilterChange = (key, value) => {
        // Reset to page 1 when filters change? (Optional, depends on desired UX)
        // setPagination(prev => ({ ...prev, pageIndex: 0 }));
        setFilters(prev => ({ ...prev, [key]: value === 'all' ? '' : value }));
    };

    // No active plans message remains the same
    if (options.activePlans.length === 0 && !isLoading) {
        return (
            <Card>
                <CardHeader><CardTitle>Chưa tham gia đợt khóa luận</CardTitle></CardHeader>
                <CardContent><p>Bạn không thể tìm nhóm khi chưa tham gia vào một đợt khóa luận đang hoạt động.</p></CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Tìm kiếm nhóm</CardTitle>
                    <CardDescription>Tìm và xin gia nhập các nhóm còn trống thành viên.</CardDescription>
                </CardHeader>
                {/* Filter Section remains the same */}
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Select onValueChange={setSelectedPlanId} value={selectedPlanId} disabled={options.activePlans.length <= 1}>
                             <SelectTrigger>
                                <div className='flex items-center gap-2'>
                                    <BookCopy className='h-4 w-4 text-muted-foreground' />
                                    <SelectValue placeholder="Chọn một kế hoạch..." />
                                </div>
                             </SelectTrigger>
                             <SelectContent>
                                {options.activePlans.map(p => <SelectItem key={p.ID_KEHOACH} value={String(p.ID_KEHOACH)}>{p.TEN_DOT}</SelectItem>)}
                             </SelectContent>
                         </Select>
                        <Input placeholder="Tìm theo tên nhóm..." value={filters.search} onChange={e => handleFilterChange('search', e.target.value)} />
                        <Select value={filters.ID_CHUYENNGANH} onValueChange={v => handleFilterChange('ID_CHUYENNGANH', v)}>
                            <SelectTrigger><SelectValue placeholder="Lọc theo chuyên ngành" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả chuyên ngành</SelectItem>
                                {options.chuyenNganhs.map(o => <SelectItem key={o.ID_CHUYENNGANH} value={String(o.ID_CHUYENNGANH)}>{o.TEN_CHUYENNGANH}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filters.ID_KHOA_BOMON} onValueChange={v => handleFilterChange('ID_KHOA_BOMON', v)}>
                            <SelectTrigger><SelectValue placeholder="Lọc theo khoa/bộ môn" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả khoa/bộ môn</SelectItem>
                                {options.khoaBomons.map(o => <SelectItem key={o.ID_KHOA_BOMON} value={String(o.ID_KHOA_BOMON)}>{o.TEN_KHOA_BOMON}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* --- TABLE DISPLAY --- */}
            <Card>
                <CardHeader>
                     <CardTitle>Kết quả tìm kiếm ({groups.length})</CardTitle>
                 </CardHeader>
                 <CardContent>
                     {isLoading ? (
                         <div className="text-center p-8"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary"/></div>
                     ) : (
                         <div className="border rounded-md">
                             <Table>
                                 <TableHeader>
                                     <TableRow>
                                         <TableHead className="w-[30%]">Tên Nhóm</TableHead>
                                         <TableHead>Trưởng nhóm</TableHead>
                                         <TableHead className="w-[15%] text-center">Thành viên</TableHead>
                                         <TableHead>Chuyên ngành / Khoa</TableHead>
                                         <TableHead className="w-[15%] text-right">Hành động</TableHead>
                                     </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                     {groups.length > 0 ? (
                                         groups.map(group => (
                                             <TableRow key={group.ID_NHOM}>
                                                 <TableCell className="font-medium">{group.TEN_NHOM}</TableCell>
                                                 <TableCell>{group.nhomtruong.HODEM_VA_TEN}</TableCell>
                                                 <TableCell className="text-center">{group.SO_THANHVIEN_HIENTAI} / 4</TableCell>
                                                 <TableCell className="text-xs text-muted-foreground">
                                                     {group.chuyennganh?.TEN_CHUYENNGANH || group.khoabomon?.TEN_KHOA_BOMON || 'N/A'}
                                                 </TableCell>
                                                 <TableCell className="text-right">
                                                     {group.da_gui_yeu_cau ? (
                                                         <Button variant="outline" size="sm" disabled className="text-xs h-8">
                                                             <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Đã gửi
                                                         </Button>
                                                     ) : (
                                                         <Button size="sm" onClick={() => setSelectedGroup(group)} className="text-xs h-8">
                                                             <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Xin gia nhập
                                                         </Button>
                                                     )}
                                                 </TableCell>
                                             </TableRow>
                                         ))
                                     ) : (
                                         <TableRow>
                                             <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                 Không tìm thấy nhóm nào phù hợp với tiêu chí của bạn.
                                             </TableCell>
                                         </TableRow>
                                     )}
                                 </TableBody>
                             </Table>
                         </div>
                     )}
                </CardContent>
            </Card>
            {/* --- END TABLE DISPLAY --- */}

            {/* RequestJoinDialog remains the same */}
            <RequestJoinDialog
                group={selectedGroup}
                isOpen={!!selectedGroup}
                setIsOpen={() => setSelectedGroup(null)} // Close dialog by clearing selectedGroup
                onSuccess={fetchData} // Refresh data after sending request
            />
        </div>
    );
}