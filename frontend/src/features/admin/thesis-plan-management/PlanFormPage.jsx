import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { createThesisPlan, updateThesisPlan, getThesisPlanById, previewNewPlan } from '@/api/thesisPlanService';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, PlusCircle, Trash2, Eye, ChevronLeft, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const planSchema = z.object({
    TEN_DOT: z.string().min(5, "Tên đợt phải có ít nhất 5 ký tự."),
    NAMHOC: z.string().min(1, "Năm học không được trống."),
    HOCKY: z.string().min(1, "Học kỳ không được trống."),
    KHOAHOC: z.string().min(1, "Khóa học không được trống."),
    HEDAOTAO: z.string().min(1, "Hệ đào tạo không được trống."),
    NGAY_BATDAU: z.string().min(1, "Ngày bắt đầu không được trống."),
    NGAY_KETHUC: z.string().min(1, "Ngày kết thúc không được trống."),
    mocThoigians: z.array(
        z.object({
            id: z.any().optional().nullable(),
            TEN_SUKIEN: z.string().min(1, "Tên sự kiện không được trống."),
            NGAY_BATDAU: z.string().min(1, "Ngày bắt đầu không được trống."),
            NGAY_KETTHUC: z.string().min(1, "Ngày kết thúc không được trống."),
            MOTA: z.string().max(255, "Mô tả không quá 255 ký tự.").optional().nullable(),
        }).refine(data => data.NGAY_KETTHUC >= data.NGAY_BATDAU, {
            message: "Ngày kết thúc của mục phải sau hoặc bằng ngày bắt đầu.",
            path: ["NGAY_KETTHUC"],
        })
    ).min(1, "Phải có ít nhất một mốc thời gian."),
}).refine(data => data.NGAY_KETHUC >= data.NGAY_BATDAU, {
    message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.",
    path: ["NGAY_KETHUC"],
});


const SortableItem = ({ children, id }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // Truyền listeners xuống cho children để chỉ định handle kéo thả
    return (
        <div ref={setNodeRef} style={style}>
            {React.cloneElement(children, { ...attributes, listeners })}
        </div>
    );
};


export default function PlanFormPage() {
    const { planId } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!planId;

    const [isLoading, setIsLoading] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);

    const form = useForm({
        resolver: zodResolver(planSchema),
        defaultValues: {
            TEN_DOT: '', NAMHOC: '', HOCKY: '', KHOAHOC: '', HEDAOTAO: 'Cử nhân', NGAY_BATDAU: '', NGAY_KETHUC: '',
            mocThoigians: [{ TEN_SUKIEN: '', NGAY_BATDAU: '', NGAY_KETTHUC: '', MOTA: '' }]
        }
    });

    const { fields, append, remove, move, insert } = useFieldArray({
        control: form.control,
        name: "mocThoigians"
    });

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor)
    );

    useEffect(() => {
        if (isEditMode) {
            setIsLoading(true);
            getThesisPlanById(planId)
                .then(data => {
                    form.reset({
                        ...data,
                        NGAY_BATDAU: data.NGAY_BATDAU ? format(new Date(data.NGAY_BATDAU), 'yyyy-MM-dd') : '',
                        NGAY_KETHUC: data.NGAY_KETHUC ? format(new Date(data.NGAY_KETHUC), 'yyyy-MM-dd') : '',
                        mocThoigians: (data.moc_thoigians || []).map(m => ({
                            id: m.ID,
                            TEN_SUKIEN: m.TEN_SUKIEN,
                            MOTA: m.MOTA,
                            NGAY_BATDAU: m.NGAY_BATDAU ? format(new Date(m.NGAY_BATDAU), "yyyy-MM-dd'T'HH:mm") : '',
                            NGAY_KETTHUC: m.NGAY_KETTHUC ? format(new Date(m.NGAY_KETTHUC), "yyyy-MM-dd'T'HH:mm") : '',
                        }))
                    });
                })
                .finally(() => setIsLoading(false));
        }
    }, [planId, isEditMode, form]);

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = fields.findIndex((item) => item.id === active.id);
            const newIndex = fields.findIndex((item) => item.id === over.id);
            move(oldIndex, newIndex);
        }
    };

    const onSubmit = async (data) => {
        setIsLoading(true);
        const payload = {
            ...data,
            mocThoigians: data.mocThoigians.map(m => ({ ...m, id: m.ID || m.id }))
        };

        try {
            if (isEditMode) {
                await updateThesisPlan(planId, payload);
                toast.success("Cập nhật kế hoạch thành công!");
            } else {
                await createThesisPlan(payload);
                toast.success("Tạo kế hoạch mới thành công!");
            }
            navigate('/admin/thesis-plans');
        } catch (error) {
            toast.error(error.response?.data?.message || "Thao tác thất bại.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePreview = async () => {
        const isValid = await form.trigger();
        if (!isValid) {
            toast.error("Vui lòng điền đầy đủ các trường thông tin bắt buộc trước khi xem trước.");
            return;
        }

        setIsPreviewing(true);
        try {
            const formData = form.getValues();
            const blob = await previewNewPlan(formData);
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error("Không thể tạo bản xem trước. Vui lòng kiểm tra lại dữ liệu.");
        } finally {
            setIsPreviewing(false);
        }
    };

    if (isLoading && isEditMode) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Button type="button" variant="outline" size="sm" onClick={() => navigate('/admin/thesis-plans')}>
                            <ChevronLeft className="mr-2 h-4 w-4" /> Quay lại
                        </Button>
                        <h1 className="text-3xl font-bold mt-2">{isEditMode ? 'Chỉnh sửa Kế hoạch' : 'Tạo Kế hoạch Khóa luận mới'}</h1>
                        <p className="text-muted-foreground">Điền thông tin và các mốc thời gian quan trọng của đợt khóa luận.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={handlePreview} disabled={isPreviewing || isLoading}>
                            {isPreviewing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />} Xem trước
                        </Button>
                        <Button type="submit" disabled={isLoading || isPreviewing}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {isEditMode ? 'Lưu thay đổi' : 'Tạo kế hoạch'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <Card className="lg:col-span-1 sticky top-20">
                        <CardHeader>
                            <CardTitle>Thông tin chung</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField name="TEN_DOT" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Tiêu đề (Tên đợt)</FormLabel><FormControl><Input placeholder="VD: KLTN HK1, 2025-2026" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField name="NAMHOC" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Năm học</FormLabel><FormControl><Input placeholder="2025-2026" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField name="HOCKY" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Học kỳ</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger></FormControl><SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem><SelectItem value="3">Hè</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField name="KHOAHOC" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Khóa</FormLabel><FormControl><Input placeholder="K13" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField name="HEDAOTAO" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Hệ đào tạo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Cử nhân">Cử nhân</SelectItem><SelectItem value="Kỹ sư">Kỹ sư</SelectItem><SelectItem value="Thạc sỹ">Thạc sỹ</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField name="NGAY_BATDAU" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Ngày bắt đầu</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField name="NGAY_KETHUC" control={form.control} render={({ field }) => (
                                    <FormItem><FormLabel>Ngày kết thúc</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="lg:col-span-2 space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Kế hoạch thực hiện</CardTitle>
                                    <CardDescription>Kéo thả để sắp xếp lại các mục.</CardDescription>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ TEN_SUKIEN: '', NGAY_BATDAU: '', NGAY_KETTHUC: '', MOTA: '' })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Thêm mục
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[calc(100vh-22rem)] pr-4">
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext items={fields.map(field => field.id)} strategy={verticalListSortingStrategy}>
                                            <div className="space-y-4">
                                                {fields.map((field, index) => (
                                                    <div key={field.id} className="group relative">
                                                        <SortableItem id={field.id}>
                                                            {/* === SỬA LỖI: Truyền `listeners` vào đây === */}
                                                            <div className="grid grid-cols-12 gap-x-4 gap-y-2 items-start p-4 border rounded-lg relative bg-background transition-shadow hover:shadow-md">
                                                                <div {...field.listeners} className="absolute -left-5 top-1/2 -translate-y-1/2 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <GripVertical className="h-5 w-5" />
                                                                </div>
                                                                {/* === KẾT THÚC SỬA LỖI === */}

                                                                <div className="col-span-12">
                                                                    <FormField name={`mocThoigians.${index}.TEN_SUKIEN`} control={form.control} render={({ field }) => (
                                                                        <FormItem><FormLabel>Nội dung thực hiện (Mục {index + 1})</FormLabel><FormControl><Input {...field} placeholder="VD: Sinh viên đăng ký nhóm" /></FormControl><FormMessage /></FormItem>
                                                                    )}/>
                                                                </div>
                                                                <div className="col-span-12">
                                                                    <FormField name={`mocThoigians.${index}.MOTA`} control={form.control} render={({ field }) => (
                                                                        <FormItem><FormLabel>Mô tả (tùy chọn)</FormLabel>
                                                                        <FormControl>
                                                                            <Textarea placeholder="Thêm mô tả chi tiết cho mốc thời gian này..." className="resize-none" {...field} />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                        </FormItem>
                                                                    )}/>
                                                                </div>
                                                                <div className="col-span-6">
                                                                    <FormField name={`mocThoigians.${index}.NGAY_BATDAU`} control={form.control} render={({ field }) => (
                                                                        <FormItem><FormLabel>Thời gian bắt đầu</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                                                                    )}/>
                                                                </div>
                                                                <div className="col-span-6">
                                                                    <FormField name={`mocThoigians.${index}.NGAY_KETTHUC`} control={form.control} render={({ field }) => (
                                                                        <FormItem><FormLabel>Thời gian kết thúc</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                                                                    )}/>
                                                                </div>
                                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive">
                                                                    <Trash2 className="h-4 w-4"/>
                                                                </Button>
                                                            </div>
                                                        </SortableItem>
                                                        <div className="w-full h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0 rounded-full bg-muted text-muted-foreground"
                                                                onClick={() => insert(index + 1, { TEN_SUKIEN: '', NGAY_BATDAU: '', NGAY_KETTHUC: '', MOTA: '' })}
                                                            >
                                                                <PlusCircle className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </Form>
    );
}