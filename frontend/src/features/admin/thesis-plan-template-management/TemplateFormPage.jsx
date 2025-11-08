import React, { useState, useEffect, useId, useCallback } from 'react'; // Added useCallback
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { getAdminThesisPlanTemplateById, createAdminThesisPlanTemplate, updateAdminThesisPlanTemplate } from '@/api/thesisPlanService';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, PlusCircle, Trash2, ChevronLeft, GripVertical, Info } from 'lucide-react'; // Added Info icon
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils'; // Added cn

// Schema validation (no change)
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
      VAITRO_THUCHIEN_MACDINH: z.string().max(255).optional().nullable(),
    })
  ).min(1, "Phải có ít nhất một mốc thời gian."),
});

// Role options (no change)
const ROLES_OPTIONS = ["Sinh viên", "Giảng viên", "Giáo vụ", "Trưởng bộ môn", "Trưởng khoa"];

// --- REDESIGNED MilestoneTemplateItem ---
const MilestoneTemplateItem = React.forwardRef(({ index, field, remove, form, handleProps, style, ...props }, ref) => {
    return (
        <div
            ref={ref}
            style={style}
            {...props}
            // Use subtle background, rounded corners, padding, and hover effect
            className="grid grid-cols-12 gap-x-4 gap-y-3 items-start p-4 border rounded-lg bg-background hover:bg-muted/50 transition-colors relative group"
        >
            {/* Drag Handle - styled */}
            <div
                {...handleProps}
                className="absolute -left-7 top-4 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity p-1 touch-none"
                title="Kéo thả để sắp xếp"
            >
                <GripVertical className="h-5 w-5" />
            </div>

            {/* Fields organized */}
            <div className="col-span-12">
                <FormField
                    name={`mocThoigians.${index}.TEN_SUKIEN`}
                    control={form.control}
                    render={({ field: fld }) => (
                        <FormItem>
                            <FormLabel className="text-sm">Nội dung (Mục {index + 1})*</FormLabel>
                            <FormControl><Input {...fld} /></FormControl>
                            <FormMessage className="text-xs" />
                        </FormItem>
                    )}
                />
            </div>
            <div className="col-span-12">
                <FormField
                    name={`mocThoigians.${index}.MOTA`}
                    control={form.control}
                    render={({ field: fld }) => (
                        <FormItem>
                            <FormLabel className="text-sm">Mô tả</FormLabel>
                            <FormControl><Textarea {...fld} className="min-h-[60px] resize-y" value={fld.value ?? ''} /></FormControl>
                            <FormMessage className="text-xs" />
                        </FormItem>
                    )}
                />
            </div>
             <div className="col-span-12 sm:col-span-4"> {/* Adjusted grid span */}
                 <FormField
                    name={`mocThoigians.${index}.OFFSET_BATDAU`}
                    control={form.control}
                    render={({ field: fld }) => (
                        <FormItem>
                            <FormLabel className="text-sm">Bắt đầu sau (ngày)*</FormLabel>
                            <FormControl><Input type="number" min="0" {...fld} /></FormControl>
                            <FormMessage className="text-xs" />
                        </FormItem>
                    )}
                />
            </div>
             <div className="col-span-12 sm:col-span-4"> {/* Adjusted grid span */}
                 <FormField
                    name={`mocThoigians.${index}.THOI_LUONG`}
                    control={form.control}
                    render={({ field: fld }) => (
                        <FormItem>
                            <FormLabel className="text-sm">Thời lượng (ngày)*</FormLabel>
                            <FormControl><Input type="number" min="1" {...fld} /></FormControl>
                            <FormMessage className="text-xs" />
                        </FormItem>
                    )}
                />
            </div>
            <div className="col-span-12 sm:col-span-4"> {/* Adjusted grid span */}
                <FormField
                    name={`mocThoigians.${index}.VAITRO_THUCHIEN_MACDINH`}
                    control={form.control}
                    render={({ field: fld }) => (
                        <FormItem>
                            <FormLabel className="text-sm">Vai trò MĐ</FormLabel>
                            <Select
                                onValueChange={(value) => fld.onChange(value === "none" ? null : value)}
                                value={fld.value || "none"}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn vai trò..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="none">-- Không chọn --</SelectItem>
                                    {ROLES_OPTIONS.map(role => (
                                        <SelectItem key={role} value={role}>{role}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                             <FormMessage className="text-xs" />
                        </FormItem>
                    )}
                />
            </div>
            {/* Remove Button */}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                disabled={form.getValues('mocThoigians').length <= 1}
                className="absolute top-2 right-2 text-muted-foreground hover:text-destructive h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Xóa mục này"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
});
MilestoneTemplateItem.displayName = 'MilestoneTemplateItem';

// Sortable wrapper (no change)
const SortableItemWrapper = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return React.cloneElement(React.Children.only(children), { ref: setNodeRef, style: style, ...attributes, handleProps: listeners });
};

// --- Loading Skeleton ---
const FormSkeleton = () => (
    <div className="space-y-6 p-4 md:p-8">
        <div className="flex items-center justify-between">
            <div>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-4 w-80 mt-1" />
            </div>
            <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <Card className="lg:col-span-1">
                 <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                 <CardContent className="space-y-4">
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-10 w-full" />
                     <Skeleton className="h-20 w-full" />
                 </CardContent>
            </Card>
             <Card className="lg:col-span-2">
                 <CardHeader className="flex flex-row items-center justify-between">
                     <Skeleton className="h-6 w-1/3" />
                     <Skeleton className="h-9 w-28" />
                 </CardHeader>
                 <CardContent className="space-y-4">
                      <Skeleton className="h-40 w-full" />
                      <Skeleton className="h-40 w-full" />
                 </CardContent>
            </Card>
        </div>
    </div>
);

export default function TemplateFormPage() {
    // --- (Hooks and state initialization - no change) ---
    const { templateId } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!templateId;
    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const form = useForm({
        resolver: zodResolver(templateSchema),
        defaultValues: { /* ... default values ... */
            TEN_MAU: '', HEDAOTAO_MACDINH: 'Cử nhân', SO_TUAN_MACDINH: 12, MO_TA: '',
            mocThoigians: [{ id: crypto.randomUUID(), ID_MAU_MOC: null, TEN_SUKIEN: '', OFFSET_BATDAU: 0, THOI_LUONG: 1, MOTA: '', VAITRO_THUCHIEN_MACDINH: null }]
        }
    });
    const { fields, append, remove, move, insert } = useFieldArray({
        control: form.control,
        name: "mocThoigians",
        keyName: "arrayId" // Keep custom key name if needed
    });
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

    // --- (useEffect for loading data - no change) ---
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
                            arrayId: crypto.randomUUID(), // Ensure unique key for react-hook-form
                            id: m.ID_MAU_MOC, // Use original ID if available
                            ID_MAU_MOC: m.ID_MAU_MOC,
                            TEN_SUKIEN: m.TEN_SUKIEN || '',
                            OFFSET_BATDAU: m.OFFSET_BATDAU ?? 0,
                            THOI_LUONG: m.THOI_LUONG ?? 1,
                            MOTA: m.MOTA || '',
                            VAITRO_THUCHIEN_MACDINH: m.VAITRO_THUCHIEN_MACDINH || null,
                        }))
                    });
                })
                .catch(error => {
                    console.error("Load template error:", error);
                    toast.error("Lỗi khi tải chi tiết bản mẫu.");
                    navigate('/admin/templates');
                })
                .finally(() => setIsLoading(false));
        } else {
             form.reset({ // Reset explicitly for create mode
                 TEN_MAU: '', HEDAOTAO_MACDINH: 'Cử nhân', SO_TUAN_MACDINH: 12, MO_TA: '',
                 mocThoigians: [{
                     id: crypto.randomUUID(), // Generate ID for dnd
                     arrayId: crypto.randomUUID(),
                     ID_MAU_MOC: null,
                     TEN_SUKIEN: '',
                     OFFSET_BATDAU: 0,
                     THOI_LUONG: 1,
                     MOTA: '',
                     VAITRO_THUCHIEN_MACDINH: null
                 }]
             });
            setIsLoading(false);
        }
    }, [templateId, isEditMode, form, navigate]);


    // handleDragEnd (no change)
     const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const oldIndex = fields.findIndex((item) => item.id === active.id);
            const newIndex = fields.findIndex((item) => item.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                move(oldIndex, newIndex);
            }
        }
    }, [fields, move]);


    // onSubmit (no change)
     const onSubmit = async (data) => {
        setIsSubmitting(true);
        const payload = {
            ...data,
            mocThoigians: data.mocThoigians.map(m => ({
                // Check if 'id' is a number (existing ID) or UUID (new/temp ID)
                ID_MAU_MOC: typeof m.ID_MAU_MOC === 'number' ? m.ID_MAU_MOC : null,
                TEN_SUKIEN: m.TEN_SUKIEN,
                OFFSET_BATDAU: m.OFFSET_BATDAU,
                THOI_LUONG: m.THOI_LUONG,
                MOTA: m.MOTA,
                VAITRO_THUCHIEN_MACDINH: m.VAITRO_THUCHIEN_MACDINH || null,
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
        return <FormSkeleton />; // Use Skeleton component
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4 md:p-8">
                {/* Header Section - Improved Alignment & Spacing */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <Button type="button" variant="outline" size="sm" onClick={() => navigate('/admin/templates')} className="mb-2">
                            <ChevronLeft className="mr-2 h-4 w-4" /> Quay lại
                        </Button>
                    </div>
                    {/* Save Button */}
                    <Button type="submit" disabled={isSubmitting || !form.formState.isValid} className="w-full sm:w-auto"> {/* Add isValid check */}
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditMode ? 'Lưu thay đổi' : 'Tạo bản mẫu'}
                    </Button>
                </div>

                {/* --- REDESIGNED Two-Column Layout --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Left Column: General Info Card */}
                    {/* Use motion for subtle appearance */}
                    <motion.div
                        className="lg:col-span-1 lg:sticky lg:top-[calc(theme(spacing.14)_+_theme(spacing.8))]" // Sticky on large screens
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    >
                        <Card className="border-blue-200 dark:border-blue-800 shadow-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                     <Info className="h-5 w-5 text-primary" /> Thông tin chung
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-5 pt-2"> {/* Increased space-y */}
                                <FormField name="TEN_MAU" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tên bản mẫu*</FormLabel><FormControl><Input placeholder="VD: KLTN Cử nhân HK1" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField name="HEDAOTAO_MACDINH" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Hệ ĐT MĐ*</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Cử nhân">Cử nhân</SelectItem><SelectItem value="Kỹ sư">Kỹ sư</SelectItem><SelectItem value="Thạc sỹ">Thạc sỹ</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                                    <FormField name="SO_TUAN_MACDINH" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Số tuần MĐ*</FormLabel><FormControl><Input type="number" min="1" placeholder="12" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                </div>
                                <FormField name="MO_TA" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Mô tả (tùy chọn)</FormLabel><FormControl><Textarea rows={3} placeholder="Mô tả ngắn về bản mẫu..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )}/>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Right Column: Milestones */}
                    <motion.div
                        className="lg:col-span-2 space-y-4"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }} // Slight delay
                    >
                         <Card className="border-blue-200 dark:border-blue-800 shadow-sm">
                             <CardHeader className="flex flex-row items-center justify-between pb-4">
                                 <CardTitle className="text-lg font-semibold">Mốc thời gian ({fields.length})</CardTitle>
                                 <Button
                                     type="button"
                                     variant="outline"
                                     size="sm"
                                     onClick={() => append({
                                         // Make sure 'id' is always a unique string for dnd-kit
                                         id: crypto.randomUUID(),
                                         arrayId: crypto.randomUUID(), // Keep if needed by hook form
                                         ID_MAU_MOC: null, // Keep null for new items
                                         TEN_SUKIEN: '',
                                         OFFSET_BATDAU: 0,
                                         THOI_LUONG: 1,
                                         MOTA: '',
                                         VAITRO_THUCHIEN_MACDINH: null
                                     })}
                                 >
                                     <PlusCircle className="mr-2 h-4 w-4" /> Thêm mục
                                 </Button>
                             </CardHeader>
                             <CardContent className="pt-2"> {/* Reduce top padding */}
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={fields.map(field => field.id)} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-4">
                                            {fields.map((field, index) => (
                                                <div key={field.arrayId} className="group relative pl-7"> {/* Indent slightly for handle */}
                                                    <SortableItemWrapper id={field.id}>
                                                        <MilestoneTemplateItem
                                                            index={index}
                                                            field={field}
                                                            remove={remove}
                                                            form={form}
                                                        />
                                                    </SortableItemWrapper>
                                                    {/* Add button below (optional, can keep remove button only) */}
                                                    <div className="w-full h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                                            onClick={() => insert(index + 1, {
                                                                id: crypto.randomUUID(),
                                                                arrayId: crypto.randomUUID(),
                                                                ID_MAU_MOC: null,
                                                                TEN_SUKIEN: '',
                                                                OFFSET_BATDAU: 0,
                                                                THOI_LUONG: 1,
                                                                MOTA: '',
                                                                VAITRO_THUCHIEN_MACDINH: null
                                                            })}
                                                            title="Chèn mục mới bên dưới"
                                                        >
                                                            <PlusCircle className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                             </CardContent>
                         </Card>
                    </motion.div>
                </div>
            </form>
        </Form>
    );
}