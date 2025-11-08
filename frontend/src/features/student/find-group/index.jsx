import React, { useState, useEffect, useCallback, useId } from 'react';
import { findGroups, requestToJoin, getMyActivePlans, cancelJoinRequest } from '@/api/groupService';
import { getChuyenNganhs, getKhoaBomons } from '@/api/userService';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UserPlus, CheckCircle, BookCopy, X, AlertCircle } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
// ***** SỬA ĐỔI: Thêm AlertDialog *****
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";


const requestSchema = z.object({ LOINHAN: z.string().max(150, 'Lời nhắn không quá 150 ký tự.').optional() });

// Component Dialog để gửi yêu cầu gia nhập nhóm
const RequestJoinDialog = ({ group, isOpen, setIsOpen, onSuccess }) => {
    // ... (Không thay đổi)
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
            form.reset();
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

// ***** COMPONENT MỚI: Dialog xác nhận hủy yêu cầu *****
const CancelRequestAlert = ({ isOpen, setIsOpen, requestId, groupName, onSuccess }) => {
    const [isCanceling, setIsCanceling] = useState(false);
    const alertTitleId = useId();
    const alertDescriptionId = useId();

    const handleCancel = async () => {
        setIsCanceling(true);
        try {
            const res = await cancelJoinRequest(requestId);
            toast.success(res.message);
            onSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Hủy yêu cầu thất bại.');
        } finally {
            setIsCanceling(false);
            setIsOpen(false);
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogContent aria-labelledby={alertTitleId} aria-describedby={alertDescriptionId}>
                <AlertDialogHeader>
                    <AlertDialogTitle id={alertTitleId}>Xác nhận Hủy Yêu cầu</AlertDialogTitle>
                    <AlertDialogDescription id={alertDescriptionId}>
                        Bạn có chắc chắn muốn hủy yêu cầu tham gia nhóm <strong>"{groupName}"</strong> không?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isCanceling}>Không</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={isCanceling}
                        onClick={handleCancel}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {isCanceling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Đồng ý Hủy
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};


// Component chính của trang Tìm Nhóm
export default function FindGroupPage() {
    const [groups, setGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', ID_CHUYENNGANH: '', ID_KHOA_BOMON: '' });
    const [options, setOptions] = useState({ chuyenNganhs: [], khoaBomons: [], activePlans: [] });
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [selectedGroup, setSelectedGroup] = useState(null); // Dùng cho dialog Gửi Yêu Cầu

    // ***** STATE MỚI: Dùng cho dialog Hủy Yêu Cầu *****
    const [cancelInfo, setCancelInfo] = useState({ isOpen: false, requestId: null, groupName: '' });


    const fetchPrerequisites = useCallback(async () => {
        try {
            const [cn, kb, plans] = await Promise.all([getChuyenNganhs(), getKhoaBomons(), getMyActivePlans()]);
            setOptions({ chuyenNganhs: cn, khoaBomons: kb, activePlans: plans });
            if (plans.length > 0) {
                setSelectedPlanId(String(plans[0].ID_KEHOACH));
            } else {
                setIsLoading(false);
            }
        } catch {
            toast.error("Lỗi tải dữ liệu ban đầu.");
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPrerequisites();
    }, [fetchPrerequisites]);

    const fetchData = useCallback(async () => {
        if (!selectedPlanId) return;
        setIsLoading(true);
        try {
            const res = await findGroups(filters, selectedPlanId);
            setGroups(res.data);
        } catch (error) {
            toast.error("Tải danh sách nhóm thất bại.");
            setGroups([]);
        } finally {
            setIsLoading(false);
        }
    }, [filters, selectedPlanId]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchData]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value === 'all' ? '' : value }));
    };

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
                {/* ... (Phần CardHeader và Lọc không đổi) ... */}
                <CardHeader>
                    <CardTitle>Tìm kiếm nhóm</CardTitle>
                    <CardDescription>Tìm và xin gia nhập các nhóm còn trống thành viên.</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Select 
                            onValueChange={setSelectedPlanId} 
                            value={selectedPlanId} 
                            disabled={options.activePlans.length <= 1}
                        >
                            <SelectTrigger>
                                <div className='flex items-center gap-2'>
                                    <BookCopy className='h-4 w-4 text-muted-foreground' />
                                    <SelectValue placeholder="Chọn một kế hoạch..." />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                {options.activePlans.map(p => 
                                    <SelectItem 
                                        key={p.ID_KEHOACH} 
                                        value={String(p.ID_KEHOACH)}
                                    >
                                        {p.TEN_DOT}
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                        
                        <Input 
                            placeholder="Tìm theo tên nhóm..." 
                            value={filters.search} 
                            onChange={e => handleFilterChange('search', e.target.value)} 
                        />
                        
                        <Select 
                            value={filters.ID_CHUYENNGANH} 
                            onValueChange={v => handleFilterChange('ID_CHUYENNGANH', v)}
                        >
                            <SelectTrigger><SelectValue placeholder="Lọc theo chuyên ngành" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả chuyên ngành</SelectItem>
                                {options.chuyenNganhs.map(o => 
                                    <SelectItem 
                                        key={o.ID_CHUYENNGANH} 
                                        value={String(o.ID_CHUYENNGANH)}
                                    >
                                        {o.TEN_CHUYENNGANH}
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                        
                        <Select 
                            value={filters.ID_KHOA_BOMON} 
                            onValueChange={v => handleFilterChange('ID_KHOA_BOMON', v)}
                        >
                            <SelectTrigger><SelectValue placeholder="Lọc theo khoa/bộ môn" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả khoa/bộ môn</SelectItem>
                                {options.khoaBomons.map(o => 
                                    <SelectItem 
                                        key={o.ID_KHOA_BOMON} 
                                        value={String(o.ID_KHOA_BOMON)}
                                    >
                                        {o.TEN_KHOA_BOMON}
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Kết quả tìm kiếm ({groups.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center p-8">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary"/>
                        </div>
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
                                                    {/* ***** SỬA ĐỔI LOGIC NÚT BẤM ***** */}
                                                    {group.da_gui_yeu_cau ? (
                                                        <Button 
                                                            variant="destructive" 
                                                            size="sm" 
                                                            onClick={() => setCancelInfo({ isOpen: true, requestId: group.id_yeu_cau_da_gui, groupName: group.TEN_NHOM })}
                                                            className="text-xs h-8"
                                                        >
                                                            <X className="mr-1.5 h-3.5 w-3.5" /> Hủy
                                                        </Button>
                                                    ) : (
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => setSelectedGroup(group)} 
                                                            className="text-xs h-8"
                                                        >
                                                            <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Xin gia nhập
                                                        </Button>
                                                    )}
                                                    {/* ***** KẾT THÚC SỬA ĐỔI ***** */}
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

            {/* Dialog Xin gia nhập nhóm */}
            <RequestJoinDialog
                group={selectedGroup}
                isOpen={!!selectedGroup}
                setIsOpen={() => setSelectedGroup(null)}
                onSuccess={fetchData}
            />

            <CancelRequestAlert
                isOpen={cancelInfo.isOpen}
                setIsOpen={(isOpen) => setCancelInfo(prev => ({ ...prev, isOpen }))}
                requestId={cancelInfo.requestId}
                groupName={cancelInfo.groupName}
                onSuccess={fetchData}
            />
        </div>
    );
}