import React, { useState, useEffect, useCallback } from 'react';
import { findGroups, requestToJoin } from '@/api/groupService';
import { getChuyenNganhs, getKhoaBomons } from '@/api/userService';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, UserPlus, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const requestSchema = z.object({ LOINHAN: z.string().max(150, 'Lời nhắn không quá 150 ký tự.').optional() });

const RequestJoinDialog = ({ group, isOpen, setIsOpen, onSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);
    const form = useForm({
        resolver: zodResolver(requestSchema),
        defaultValues: { LOINHAN: '' }
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            const res = await requestToJoin(group.ID_NHOM, data);
            toast.success(res.message);
            onSuccess();
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Gửi yêu cầu thất bại.');
        } finally {
            setIsLoading(false);
        }
    };
    
    if(!group) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Xin gia nhập nhóm "{group.TEN_NHOM}"</DialogTitle>
                    <DialogDescription>Gửi lời nhắn đến nhóm trưởng để tăng cơ hội được chấp nhận.</DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="LOINHAN" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Lời nhắn (Tùy chọn)</FormLabel>
                                <FormControl><Textarea placeholder="Mình rất muốn tham gia nhóm..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Gửi yêu cầu
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
    const [options, setOptions] = useState({ chuyenNganhs: [], khoaBomons: [] });
    const [selectedGroup, setSelectedGroup] = useState(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await findGroups(filters);
            setGroups(res.data);
            // Cần thêm xử lý pagination nếu API trả về
        } catch (error) {
            toast.error("Tải danh sách nhóm thất bại.");
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchData();
        Promise.all([getChuyenNganhs(), getKhoaBomons()]).then(([cn, kb]) => {
            setOptions({ chuyenNganhs: cn, khoaBomons: kb });
        });
    }, [fetchData]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({...prev, [key]: value}));
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Tìm kiếm nhóm</CardTitle>
                    <CardDescription>Tìm và xin gia nhập các nhóm còn trống thành viên.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-4">
                    <Input placeholder="Tìm theo tên nhóm..." className="flex-grow" onChange={e => handleFilterChange('search', e.target.value)} />
                    <Select onValueChange={v => handleFilterChange('ID_CHUYENNGANH', v)}>
                        <SelectTrigger><SelectValue placeholder="Lọc theo chuyên ngành" /></SelectTrigger>
                        <SelectContent>{options.chuyenNganhs.map(o => <SelectItem key={o.ID_CHUYENNGANH} value={String(o.ID_CHUYENNGANH)}>{o.TEN_CHUYENNGANH}</SelectItem>)}</SelectContent>
                    </Select>
                     <Select onValueChange={v => handleFilterChange('ID_KHOA_BOMON', v)}>
                        <SelectTrigger><SelectValue placeholder="Lọc theo khoa/bộ môn" /></SelectTrigger>
                        <SelectContent>{options.khoaBomons.map(o => <SelectItem key={o.ID_KHOA_BOMON} value={String(o.ID_KHOA_BOMON)}>{o.TEN_KHOA_BOMON}</SelectItem>)}</SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {isLoading ? (
                 <div className="text-center p-8"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary"/></div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map(group => (
                        <Card key={group.ID_NHOM}>
                            <CardHeader>
                                <CardTitle>{group.TEN_NHOM}</CardTitle>
                                <CardDescription>Trưởng nhóm: {group.nhomtruong.HODEM_VA_TEN}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">Thành viên</p>
                                    <p className="font-medium">{group.SO_THANHVIEN_HIENTAI} / 4</p>
                                </div>
                                {group.chuyennganh && <div>
                                    <p className="text-xs text-muted-foreground">Chuyên ngành</p>
                                    <p className="font-medium">{group.chuyennganh.TEN_CHUYENNGANH}</p>
                                </div>}
                                {group.mota && <p className="text-sm italic text-muted-foreground">"{group.mota}"</p>}
                                {group.da_gui_yeu_cau ? (
                                    <Button variant="outline" disabled className="w-full"><CheckCircle className="mr-2 h-4 w-4" /> Đã gửi yêu cầu</Button>
                                ) : (
                                    <Button className="w-full" onClick={() => setSelectedGroup(group)}><UserPlus className="mr-2 h-4 w-4" /> Xin gia nhập</Button>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
            
            <RequestJoinDialog 
                group={selectedGroup} 
                isOpen={!!selectedGroup} 
                setIsOpen={() => setSelectedGroup(null)}
                onSuccess={fetchData}
            />
        </div>
    );
}