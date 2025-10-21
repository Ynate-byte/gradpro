import React, { useState, useEffect, useId } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
// Use admin-specific API functions
import { getAdminThesisPlanTemplateById, createAdminThesisPlanTemplate, updateAdminThesisPlanTemplate } from '@/api/thesisPlanService';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, PlusCircle, Trash2, ChevronLeft, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Skeleton } from '@/components/ui/skeleton';

// Schema for Template Form (no changes)
const templateSchema = z.object({
    TEN_MAU: z.string().min(3, "Tên bản mẫu phải có ít nhất 3 ký tự.").max(100),
    HEDAOTAO_MACDINH: z.string().min(1, "Hệ đào tạo không được trống."),
    SO_TUAN_MACDINH: z.preprocess(
        (val) => Number(String(val).trim()) || 0,
        z.number().int().min(1, "Số tuần phải là số nguyên dương.")
    ),
    MO_TA: z.string().max(1000, "Mô tả không quá 1000 ký tự.").optional().nullable(),
    mocThoigians: z.array(
        z.object({
            ID_MAU_MOC: z.any().optional().nullable(),
            TEN_SUKIEN: z.string().min(1, "Tên sự kiện không được trống.").max(255),
            OFFSET_BATDAU: z.preprocess(
                (val) => Number(String(val).trim()) || 0,
                 z.number().int().min(0, "Offset phải là số không âm.")
             ),
            THOI_LUONG: z.preprocess(
                (val) => Number(String(val).trim()) || 0,
                 z.number().int().min(1, "Thời lượng phải lớn hơn 0.")
             ),
            MOTA: z.string().optional().nullable(),
        })
    ).min(1, "Phải có ít nhất một mốc thời gian."),
});

// *** MODIFICATION 1: Sortable Milestone Item ***
// Accept style and ...props (which include attributes) from cloneElement
// The forwarded 'ref' will now be the 'setNodeRef' from useSortable
const MilestoneTemplateItem = React.forwardRef(({ index, field, remove, form, handleProps, style, ...props }, ref) => {
    return (
        // Apply the ref, style, and attributes to the outer div
        <div ref={ref} style={style} {...props} className="grid grid-cols-12 gap-x-4 gap-y-2 items-start p-4 border rounded-lg bg-background hover:shadow-md relative group">
             {/* Pass 'handleProps' (listeners) to the drag handle */}
            <div {...handleProps} className="absolute -left-6 top-1/2 -translate-y-1/2 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity p-1 touch-none">
                <GripVertical className="h-5 w-5" />
            </div>
            {/* Event Name */}
            <div className="col-span-12">
                <FormField name={`mocThoigians.${index}.TEN_SUKIEN`} control={form.control} render={({ field: fld }) => ( <FormItem><FormLabel>Nội dung (Mục {index + 1})*</FormLabel><FormControl><Input {...fld} /></FormControl><FormMessage /></FormItem> )}/>
            </div>
            {/* Description */}
            <div className="col-span-12">
                <FormField name={`mocThoigians.${index}.MOTA`} control={form.control} render={({ field: fld }) => ( <FormItem><FormLabel>Mô tả</FormLabel><FormControl><Textarea {...fld} className="min-h-[60px] resize-y" /></FormControl><FormMessage /></FormItem> )}/>
            </div>
             {/* Offset */}
             <div className="col-span-6">
                <FormField name={`mocThoigians.${index}.OFFSET_BATDAU`} control={form.control} render={({ field: fld }) => ( <FormItem><FormLabel>Bắt đầu sau (ngày)*</FormLabel><FormControl><Input type="number" min="0" {...fld} /></FormControl><FormMessage /></FormItem> )}/>
            </div>
             {/* Duration */}
             <div className="col-span-6">
                 <FormField name={`mocThoigians.${index}.THOI_LUONG`} control={form.control} render={({ field: fld }) => ( <FormItem><FormLabel>Thời lượng (ngày)*</FormLabel><FormControl><Input type="number" min="1" {...fld} /></FormControl><FormMessage /></FormItem> )}/>
            </div>
            {/* Remove Button */}
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={form.getValues('mocThoigians').length <= 1} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
        </div>
    );
});
MilestoneTemplateItem.displayName = 'MilestoneTemplateItem';

// *** MODIFICATION 2: SortableItemWrapper ***
// Remove React.forwardRef
// Clone the child and pass all necessary dnd props to it
const SortableItemWrapper = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    // Clone the single child and pass ALL props
    return React.cloneElement(React.Children.only(children), {
        ref: setNodeRef,       // Pass the node ref for dnd-kit
        style: style,          // Pass the transform style
        ...attributes,         // Pass dnd attributes
        handleProps: listeners // Pass listeners (which MilestoneTemplateItem expects as 'handleProps')
    });
};
// No displayName needed if not a forwardRef


// Main Template Form Page Component
export default function TemplateFormPage() {
    // ... (All other hooks and functions remain exactly the same) ...
    const { templateId } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!templateId;

    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm({
        resolver: zodResolver(templateSchema),
        defaultValues: {
            TEN_MAU: '',
            HEDAOTAO_MACDINH: 'Cử nhân',
            SO_TUAN_MACDINH: 12,
            MO_TA: '',
            mocThoigians: [{
                id: crypto.randomUUID(), 
                ID_MAU_MOC: null,
                TEN_SUKIEN: '',
                OFFSET_BATDAU: 0,
                THOI_LUONG: 1,
                MOTA: ''
            }]
        }
    });

    const { fields, append, remove, move, insert } = useFieldArray({
        control: form.control,
        name: "mocThoigians",
        keyName: "arrayId"
    });

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

    useEffect(() => {
        if (isEditMode && templateId) {
            setIsLoading(true);
            getAdminThesisPlanTemplateById(templateId)
                .then(data => {
                    form.reset({
                        TEN_MAU: data.TEN_MAU || '',
                        HEDAOTAO_MACDINH: data.HEDAOTAO_MACDINH || 'Cử nhân',
                        SO_TUAN_MACDINH: data.SO_TUAN_MACDINH || 12,
                        MO_TA: data.MO_TA || '',
                        mocThoigians: (data.mau_moc_thoigians || []).map(m => ({
                            arrayId: crypto.randomUUID(), 
                            id: m.ID_MAU_MOC,           
                            ID_MAU_MOC: m.ID_MAU_MOC,
                            TEN_SUKIEN: m.TEN_SUKIEN || '',
                            OFFSET_BATDAU: m.OFFSET_BATDAU ?? 0,
                            THOI_LUONG: m.THOI_LUONG ?? 1,
                            MOTA: m.MOTA || '',
                        }))
                    });
                })
                .catch(error => {
                    console.error("Load template error:", error);
                    toast.error("Lỗi khi tải chi tiết bản mẫu.");
                    navigate('/admin/templates');
                })
                .finally(() => setIsLoading(false));
        } else if (!isEditMode) {
             form.reset({
                 TEN_MAU: '', HEDAOTAO_MACDINH: 'Cử nhân', SO_TUAN_MACDINH: 12, MO_TA: '',
                 mocThoigians: [{ arrayId: crypto.randomUUID(), id: crypto.randomUUID(), ID_MAU_MOC: null, TEN_SUKIEN: '', OFFSET_BATDAU: 0, THOI_LUONG: 1, MOTA: '' }]
            });
            setIsLoading(false);
        }
    }, [templateId, isEditMode, form, navigate]);

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const oldIndex = fields.findIndex((item) => item.id === active.id);
            const newIndex = fields.findIndex((item) => item.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                move(oldIndex, newIndex);
            }
        }
    };

    const onSubmit = async (data) => {
        setIsSubmitting(true);
         const payload = {
            ...data,
            mocThoigians: data.mocThoigians.map(m => ({
                ID_MAU_MOC: typeof m.ID_MAU_MOC === 'number' ? m.ID_MAU_MOC : null,
                TEN_SUKIEN: m.TEN_SUKIEN,
                OFFSET_BATDAU: m.OFFSET_BATDAU,
                THOI_LUONG: m.THOI_LUONG,
                MOTA: m.MOTA
            }))
        };

        try {
            if (isEditMode) {
                await updateAdminThesisPlanTemplate(templateId, payload);
                toast.success("Cập nhật bản mẫu thành công!");
            } else {
                await createAdminThesisPlanTemplate(payload);
                toast.success("Tạo bản mẫu mới thành công!");
            }
            navigate('/admin/templates');
        } catch (error) {
            console.error("Submit template error:", error.response?.data || error);
            toast.error(error.response?.data?.message || "Thao tác thất bại.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return ( <div className="space-y-6 p-4 md:p-8">...</div> ); // Skeleton
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4 md:p-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <Button type="button" variant="outline" size="sm" onClick={() => navigate('/admin/templates')}>
                            <ChevronLeft className="mr-2 h-4 w-4" /> Quay lại
                        </Button>
                        <h1 className="text-3xl font-bold mt-2">{isEditMode ? 'Chỉnh sửa Bản mẫu' : 'Tạo Bản mẫu mới'}</h1>
                        <p className="text-muted-foreground">Điền thông tin và các mốc thời gian tương đối cho bản mẫu.</p>
                    </div>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditMode ? 'Lưu thay đổi' : 'Tạo bản mẫu'}
                    </Button>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Left Column: General Info */}
                    <Card className="lg:col-span-1 sticky top-[calc(theme(spacing.14)_+_theme(spacing.8))]">
                        <CardHeader><CardTitle>Thông tin chung</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                             <FormField name="TEN_MAU" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tên bản mẫu*</FormLabel><FormControl><Input placeholder="VD: KLTN Cử nhân" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                             <div className="grid grid-cols-2 gap-4">
                                  <FormField name="HEDAOTAO_MACDINH" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Hệ ĐT Mặc định*</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Cử nhân">Cử nhân</SelectItem><SelectItem value="Kỹ sư">Kỹ sư</SelectItem><SelectItem value="Thạc sỹ">Thạc sỹ</SelectItem></SelectContent></Select><FormMessage /></FormItem>)}/>
                                  <FormField name="SO_TUAN_MACDINH" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Số tuần MĐ*</FormLabel><FormControl><Input type="number" min="1" placeholder="12" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                             </div>
                             <FormField name="MO_TA" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Mô tả (tùy chọn)</FormLabel><FormControl><Textarea rows={3} placeholder="Mô tả ngắn về bản mẫu..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                        </CardContent>
                    </Card>

                    {/* Right Column: Milestones */}
                    <div className="lg:col-span-2 space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Mốc thời gian ({fields.length})</CardTitle>
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ arrayId: crypto.randomUUID(), id: crypto.randomUUID(), ID_MAU_MOC: null, TEN_SUKIEN: '', OFFSET_BATDAU: 0, THOI_LUONG: 1, MOTA: '' })}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Thêm mục
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[calc(100vh_-_22rem)] pr-4 -mr-4">
                                     <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                         <SortableContext items={fields.map(field => field.id)} strategy={verticalListSortingStrategy}>
                                             <div className="space-y-4">{fields.map((field, index) => (
                                                 // *** MODIFICATION 3: Use 'field.arrayId' for React key ***
                                                 <div key={field.arrayId} className="group relative">
                                                      <SortableItemWrapper id={field.id}>
                                                          <MilestoneTemplateItem
                                                              index={index}
                                                              field={field}
                                                              remove={remove}
                                                              form={form}
                                                          />
                                                      </SortableItemWrapper>
                                                      {/* Insert Button */}
                                                      <div className="w-full h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary" onClick={() => insert(index + 1, { arrayId: crypto.randomUUID(), id: crypto.randomUUID(), ID_MAU_MOC: null, TEN_SUKIEN: '', OFFSET_BATDAU: 0, THOI_LUONG: 1, MOTA: '' })}>
                                                              <PlusCircle className="h-4 w-4" />
                                                          </Button>
                                                      </div>
                                                  </div>
                                             ))}</div>
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