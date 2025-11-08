import React, { useState, useEffect, useCallback, useId, useRef } from 'react' // [MỚI] Thêm useRef
import { useForm, useFieldArray } from 'react-hook-form'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format, parseISO, addDays, getDay, startOfDay, isValid, differenceInCalendarDays, isSaturday, isSunday } from 'date-fns'
import { vi } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { createThesisPlan, updateThesisPlan, getThesisPlanById, previewNewPlan, getThesisPlanTemplateDetails } from '../../../api/thesisPlanService'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, PlusCircle, Trash2, Eye, ChevronLeft, GripVertical, Info } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// --- HELPER FUNCTIONS (Không đổi) ---

/**
 * [SỬA] Điều chỉnh ngày sang Thứ Hai nếu rơi vào Thứ Bảy hoặc Chủ Nhật
 */
function adjustDateForWeekend(date) {
  if (!isValid(date)) return date;
  const dayOfWeek = getDay(date);
  if (dayOfWeek === 6) { // Thứ Bảy
    return startOfDay(addDays(date, 2)); // Dời sang 00:00 Thứ Hai
  }
  if (dayOfWeek === 0) { // Chủ Nhật
    return startOfDay(addDays(date, 1)); // Dời sang 00:00 Thứ Hai
  }
  return date; // Giữ nguyên
}

/**
 * Kiểm tra ngày không phải cuối tuần (cho Zod)
 */
const isNotWeekend = (val) => {
  if (!val) return true;
  try {
    const date = parseISO(val);
    if (!isValid(date)) return true;
    return !isSaturday(date) && !isSunday(date);
  } catch (e) {
    return true;
  }
};

/**
 * [SỬA] Tính toán và định dạng số ngày xấp xỉ
 */
const formatApproximateDays = (days) => {
  if (isNaN(days) || days <= 0) return '';
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  if (weeks === 0) return `${days} ngày`;
  if (remainingDays === 0) return `${days} ngày (≈ ${weeks} tuần)`;
  return `${days} ngày (≈ ${weeks} tuần, ${remainingDays} ngày)`;
};

/**
 * Định dạng ngày giờ chuẩn
 */
const DATE_FORMAT = "yyyy-MM-dd'T'HH:mm";
const DATE_ONLY_FORMAT = 'yyyy-MM-dd';

// --- ZOD SCHEMA (Không đổi) ---
const planSchema = z.object({
  TEN_DOT: z.string().min(5, "Tên đợt phải có ít nhất 5 ký tự."),
  NAMHOC: z.string().min(1, "Năm học không được trống."),
  HOCKY: z.string().min(1, "Học kỳ không được trống."),
  KHOAHOC: z.string().min(1, "Khóa học không được trống."),
  HEDAOTAO: z.string().min(1, "Hệ đào tạo không được trống."),
  SO_TUAN_THUCHIEN: z.preprocess(
    (val) => Number(String(val).trim()) || 0,
    z.number().int().min(1, "Số tuần phải là số nguyên dương.")
  ),
  NGAY_BATDAU: z.string().min(1, "Ngày bắt đầu không được trống.")
    .refine(isNotWeekend, "Ngày bắt đầu không được là Thứ Bảy hoặc Chủ Nhật."),
  NGAY_KETHUC: z.string().min(1, "Ngày kết thúc không được trống.")
    .refine(isNotWeekend, "Ngày kết thúc không được là Thứ Bảy hoặc Chủ Nhật."),
  mocThoigians: z
    .array(
      z
        .object({
          id: z.any().optional().nullable(),
          TEN_SUKIEN: z.string().min(1, "Tên sự kiện không được trống."),
          NGAY_BATDAU: z.string().min(1, "Ngày bắt đầu không được trống.")
            .refine(isNotWeekend, "Ngày bắt đầu không được là Thứ Bảy hoặc Chủ Nhật."),
          NGAY_KETTHUC: z.string().min(1, "Ngày kết thúc không được trống.")
            .refine(isNotWeekend, "Ngày kết thúc không được là Thứ Bảy hoặc Chủ Nhật."),
          MOTA: z.string().optional().nullable(),
          VAITRO_THUCHIEN: z.string().max(255).optional().nullable(),
          // [MỚI] Thêm trường 'duration' vào schema
          duration: z.preprocess(
            (val) => Number(String(val).trim()) || 0,
            z.number().int().min(1, "Thời lượng phải ít nhất 1 ngày.")
          ),
        })
        .refine(
          data => !data.NGAY_BATDAU || !data.NGAY_KETHUC || data.NGAY_KETHUC >= data.NGAY_BATDAU,
          { message: "Ngày kết thúc của mục phải sau hoặc bằng ngày bắt đầu.", path: ["NGAY_KETTHUC"] }
        )
    )
    .min(1, "Phải có ít nhất một mốc thời gian.")
}).refine(
  data => !data.NGAY_BATDAU || !data.NGAY_KETHUC || data.NGAY_KETHUC >= data.NGAY_BATDAU,
  { message: "Ngày kết thúc kế hoạch phải sau hoặc bằng ngày bắt đầu.", path: ["NGAY_KETHUC"] }
)
.refine(
  (data) => {
    // [MỚI] Kiểm tra: Ngày bắt đầu mốc >= Ngày bắt đầu kế hoạch
    if (!data.NGAY_BATDAU || data.mocThoigians.length === 0) return true;
    const planStartDate = startOfDay(parseISO(data.NGAY_BATDAU));
    if (!isValid(planStartDate)) return true;
    for (const moc of data.mocThoigians) {
      if (!moc.NGAY_BATDAU) continue; // Bỏ qua nếu chưa có ngày
      const mocStartDate = startOfDay(parseISO(moc.NGAY_BATDAU));
      if (isValid(mocStartDate) && mocStartDate < planStartDate) return false;
    }
    return true;
  },
  // [MỚI] Gán lỗi vào NGAY_BATDAU của mốc đầu tiên nếu có lỗi
  { message: "Ngày bắt đầu của mốc không được trước ngày bắt đầu kế hoạch.", path: ["mocThoigians", 0, "NGAY_BATDAU"] }
)
.refine(
  (data) => {
  	// [SỬA] Logic kiểm tra ngày kết thúc kế hoạch (đã có)
    if (!data.NGAY_KETHUC || !data.mocThoigians || data.mocThoigians.length === 0) return true;
    let latestMilestoneEndDate = null;
    try {
      for (const moc of data.mocThoigians) {
        if (moc.NGAY_KETTHUC) {
          const endDate = parseISO(moc.NGAY_KETTHUC);
          if (isValid(endDate) && (!latestMilestoneEndDate || endDate > latestMilestoneEndDate)) {
            latestMilestoneEndDate = endDate;
          }
        }
      }
      if (!latestMilestoneEndDate) return true;
      const planEndDate = parseISO(data.NGAY_KETHUC);
      if (!isValid(planEndDate)) return true;
      return startOfDay(planEndDate) >= startOfDay(latestMilestoneEndDate);
    } catch (e) { return true; }
  },
  { message: "Ngày kết thúc kế hoạch không được sớm hơn ngày kết thúc của mốc thời gian cuối cùng.", path: ["NGAY_KETHUC"] }
);

// Danh sách vai trò (Không đổi)
const ROLES_OPTIONS = ["Sinh viên", "Giảng viên", "Giáo vụ", "Trưởng bộ môn", "Trưởng khoa"];

// --- MilestoneItem (Component Mốc thời gian - Không đổi) ---
// (Dùng onBlur là chính xác để giữ hiệu năng)
const MilestoneItem = React.forwardRef(({ index, field, remove, form, handleProps, onMilestoneChange, style, ...props }, ref) => {
  // [MỚI] Lấy giá trị thời lượng từ form
  const duration = form.watch(`mocThoigians.${index}.duration`);

  return (
    <div
      ref={ref}
      style={style}
      {...props}
      className="grid grid-cols-12 gap-x-4 gap-y-3 items-start p-4 border rounded-lg bg-background hover:bg-muted/50 transition-colors relative group"
    >
      <div
        {...handleProps}
        className="absolute -left-7 top-4 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity p-1 touch-none"
        title="Kéo thả để sắp xếp"
      >
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="col-span-12">
        <FormField
          name={`mocThoigians.${index}.TEN_SUKIEN`}
          control={form.control}
          render={({ field: fld }) => (
            <FormItem>
              <FormLabel className="text-sm">Nội dung (Mục {index + 1})*</FormLabel>
              <FormControl>
                <Input {...fld} />
              </FormControl>
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
              <FormControl>
                <Textarea {...fld} className="min-h-[60px] resize-y" value={fld.value ?? ''} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      <div className="col-span-12">
        <FormField
          name={`mocThoigians.${index}.VAITRO_THUCHIEN`}
          control={form.control}
          render={({ field: fld }) => (
            <FormItem>
              <FormLabel className="text-sm">Vai trò thực hiện (Thông báo)</FormLabel>
              <Select
                onValueChange={(value) => fld.onChange(value === "none" ? null : value)}
                value={fld.value || "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn vai trò sẽ nhận thông báo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">-- Không chọn --</SelectItem>
                  {ROLES_OPTIONS.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          	  <FormDescription>
            	  Chọn vai trò sẽ nhận thông báo nhắc nhở cho mốc thời gian này.
            	</FormDescription>
            	<FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      <div className="col-span-5">
        <FormField
          name={`mocThoigians.${index}.NGAY_BATDAU`}
          control={form.control}
          render={({ field: fld }) => (
            <FormItem>
              <FormLabel className="text-sm">Bắt đầu*</FormLabel>
              <FormControl>
                {/* [GIỮ NGUYÊN] onBlur là tốt cho hiệu năng mốc con */}
                <Input type="datetime-local" {...fld} onBlur={(e) => { fld.onBlur(e); onMilestoneChange(index, 'start', e.target.value); }} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>
      {/* [MỚI] Ô Thời lượng */}
      <div className="col-span-3">
        <FormField
          name={`mocThoigians.${index}.duration`}
          control={form.control}
          render={({ field: fld }) => (
            <FormItem>
              <FormLabel className="text-sm">Thời lượng* (ngày)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  {...fld}
                  // [GIỮ NGUYÊN] onBlur là tốt cho hiệu năng mốc con
                  onBlur={(e) => {
                    fld.onBlur(e);
                    onMilestoneChange(index, 'duration', e.target.value);
                  }}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>
      <div className="col-span-4">
        <FormField
          name={`mocThoigians.${index}.NGAY_KETTHUC`}
          control={form.control}
          render={({ field: fld }) => (
            <FormItem>
              <FormLabel className="text-sm">Kết thúc*</FormLabel>
              <FormControl>
                {/* [GIỮ NGUYÊN] onBlur là tốt cho hiệu năng mốc con */}
                <Input type="datetime-local" {...fld} onBlur={(e) => { fld.onBlur(e); onMilestoneChange(index, 'end', e.target.value); }} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>
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
  )
})
MilestoneItem.displayName = 'MilestoneItem'

// --- (SortableItemWrapper không đổi) ---
const SortableItemWrapper = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return React.cloneElement(React.Children.only(children), {
    ref: setNodeRef,
    style: style,
    ...attributes,
    handleProps: listeners
  })
}

// --- (PlanFormSkeleton không đổi) ---
const PlanFormSkeleton = () => (
  <div className="space-y-6 p-4 md:p-8">
    {/* ... (Nội dung Skeleton không đổi) ... */}
  </div>
);

// --- COMPONENT CHÍNH (ĐÃ CẬP NHẬT LOGIC) ---
export default function PlanFormPage() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const templateId = location.state?.templateId
  const isEditMode = !!planId

  // [MỚI] Ref để ngăn vòng lặp vô hạn
  const isProgrammaticUpdate = useRef(false);

  const [planStatus, setPlanStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(isEditMode || !!templateId)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [templateBaseWeeks, setTemplateBaseWeeks] = useState(12);

  const [milestoneMetadata, setMilestoneMetadata] = useState([]);
  const [originalTemplateMetadata, setOriginalTemplateMetadata] = useState([]);

  const [isManuallyEditingPlanEndDate, setIsManuallyEditingPlanEndDate] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [approximateDaysText, setApproximateDaysText] = useState('');

  const form = useForm({
    resolver: zodResolver(planSchema),
    defaultValues: {
      TEN_DOT: '', NAMHOC: '', HOCKY: '', KHOAHOC: '', HEDAOTAO: 'Cử nhân',
      SO_TUAN_THUCHIEN: 12,
      NGAY_BATDAU: '', NGAY_KETHUC: '',
      mocThoigians: [] // Sẽ được load
    }
  })
  
  // [MỚI] Lấy các giá trị cần theo dõi
  const watchedStartDate = form.watch('NGAY_BATDAU');
  const watchedWeeks = form.watch('SO_TUAN_THUCHIEN');
  const watchedEndDate = form.watch('NGAY_KETHUC');

  const { fields, append, remove, move, insert } = useFieldArray({
    control: form.control,
    name: "mocThoigians",
    keyName: "arrayId"
  })
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))


  // [MỚI] Hàm "Sync-Up" (Luồng 3) - Cập nhật ngày kết thúc kế hoạch (Không đổi)
  const syncPlanEndDate = useCallback(() => {
  	if (isManuallyEditingPlanEndDate && !isEditMode) return;
    const milestones = form.getValues('mocThoigians');
    if (milestones && milestones.length > 0) {
    	let latestEndDate = null;
    	for (const moc of milestones) {
    		const endDateStr = moc?.NGAY_KETTHUC;
    		if (endDateStr) {
    			try {
    				const endDate = parseISO(endDateStr);
    				if (isValid(endDate) && (!latestEndDate || endDate > latestEndDate)) {
    					latestEndDate = endDate;
    				}
    			} catch (e) { /* ignore */ }
    		}
    	}
    	if (latestEndDate && isValid(latestEndDate)) {
    		const newPlanEndDate = format(adjustDateForWeekend(latestEndDate), DATE_ONLY_FORMAT);
    		const currentPlanEndDate = form.getValues('NGAY_KETHUC');
    		if (newPlanEndDate !== currentPlanEndDate) {
    			form.setValue('NGAY_KETHUC', newPlanEndDate, { shouldValidate: true });
    			const startDateStr = form.getValues('NGAY_BATDAU');
    			if (startDateStr && isValid(parseISO(startDateStr))) {
    				try {
    					const days = differenceInCalendarDays(parseISO(newPlanEndDate), parseISO(startDateStr)) + 1;
    					setApproximateDaysText(formatApproximateDays(days));
    				} catch (e) { setApproximateDaysText(''); }
    			}
    		}
    	}
    }
  }, [form, isManuallyEditingPlanEndDate, isEditMode]);


  // Hàm "Co giãn" (Scaling) - Luồng 1 (Không đổi)
  const scaleAllMilestones = useCallback((planStartDateStr, planTotalWeeks) => {
    if (originalTemplateMetadata.length === 0) {
    	console.warn("Chưa có metadata gốc (originalTemplateMetadata) để co giãn.");
    	return;
  	}
    if (!planStartDateStr || !isValid(parseISO(planStartDateStr))) return;

    const planStartDate = adjustDateForWeekend(parseISO(planStartDateStr));
    const newTotalDays = (Number(planTotalWeeks) || 12) * 7;
    const oldTotalDays = (templateBaseWeeks || 12) * 7;
    const scaleFactor = (oldTotalDays === 0) ? 1 : (newTotalDays / oldTotalDays);

    const newMetadataArray = []; // Metadata làm việc
    let latestMilestoneEndDate = planStartDate;
    
    originalTemplateMetadata.forEach((meta, index) => {
      const scaledOffset = Math.round((meta.offset || 0) * scaleFactor);
      let scaledDuration = Math.round((meta.duration || 1) * scaleFactor);
      if (scaledDuration < 1) scaledDuration = 1;

      let eventStartDate = addDays(planStartDate, scaledOffset);
      eventStartDate = adjustDateForWeekend(eventStartDate);
      let eventEndDate = addDays(eventStartDate, scaledDuration - 1);
      eventEndDate = adjustDateForWeekend(eventEndDate);

      // Cập nhật form
      form.setValue(`mocThoigians.${index}.NGAY_BATDAU`, format(eventStartDate, DATE_FORMAT), { shouldValidate: true });
      form.setValue(`mocThoigians.${index}.NGAY_KETTHUC`, format(eventEndDate, DATE_FORMAT), { shouldValidate: true });
      form.setValue(`mocThoigians.${index}.duration`, scaledDuration, { shouldValidate: true });
      
      newMetadataArray[index] = { offset: scaledOffset, duration: scaledDuration };

      if (eventEndDate > latestMilestoneEndDate) {
        latestMilestoneEndDate = eventEndDate;
      }
    });

    setMilestoneMetadata(newMetadataArray);
    // Luồng 3: Cập nhật ngày kết thúc kế hoạch
    syncPlanEndDate();

  }, [form, templateBaseWeeks, originalTemplateMetadata, syncPlanEndDate]);


  // Hàm "Domino" (Cascading) - Luồng 2 (Không đổi)
  const cascadeMilestoneChanges = useCallback((startIndex, currentMetadata) => {
    const planStartDateStr = form.getValues('NGAY_BATDAU');
    if (!planStartDateStr || !isValid(parseISO(planStartDateStr))) return;

    const planStartDate = parseISO(planStartDateStr);
    const newMetadataArray = [...currentMetadata];
    
    for (let i = startIndex + 1; i < newMetadataArray.length; i++) {
      const prevMeta = newMetadataArray[i - 1];
      const currentMeta = newMetadataArray[i];
      
      const newOffset = (prevMeta.offset || 0) + (prevMeta.duration || 1);
      const newDuration = currentMeta.duration || 1; // Giữ nguyên duration
      
      let newStartDate = addDays(planStartDate, newOffset);
      newStartDate = adjustDateForWeekend(newStartDate);
      
      let newEndDate = addDays(newStartDate, newDuration - 1);
      newEndDate = adjustDateForWeekend(newEndDate);

      form.setValue(`mocThoigians.${i}.NGAY_BATDAU`, format(newStartDate, DATE_FORMAT), { shouldValidate: true });
      form.setValue(`mocThoigians.${i}.NGAY_KETTHUC`, format(newEndDate, DATE_FORMAT), { shouldValidate: true });
      
      newMetadataArray[i] = { offset: newOffset, duration: newDuration };
    }

    setMilestoneMetadata(newMetadataArray);
    // Luồng 3: Cập nhật ngày kết thúc kế hoạch
    syncPlanEndDate();
  }, [form, syncPlanEndDate]);

  // Hàm xử lý khi người dùng thay đổi 1 mốc (Kích hoạt Luồng 2) (Không đổi)
  const handleMilestoneChange = (index, fieldType, newValue) => {
    const planStartDateStr = form.getValues('NGAY_BATDAU');
    if (!planStartDateStr || !isValid(parseISO(planStartDateStr))) {
      toast.warning("Vui lòng chọn ngày bắt đầu kế hoạch trước.");
      // Hoàn tác giá trị
      if (fieldType === 'start' || fieldType === 'end') {
        form.setValue(`mocThoigians.${index}.${fieldType === 'start' ? 'NGAY_BATDAU' : 'NGAY_KETTHUC'}`, '');
      } else if (fieldType === 'duration') {
        form.setValue(`mocThoigians.${index}.duration`, 1);
      }
      return;
    }
    const planStartDate = parseISO(planStartDateStr);
    const newMetadataArray = [...milestoneMetadata];
    const currentMeta = { ...(newMetadataArray[index] || { offset: 0, duration: 1 }) };
    
    let startDateStr = form.getValues(`mocThoigians.${index}.NGAY_BATDAU`);
    let endDateStr = form.getValues(`mocThoigians.${index}.NGAY_KETTHUC`);
    let duration = Number(form.getValues(`mocThoigians.${index}.duration`));
    
    try {
      if (fieldType === 'start') {
        startDateStr = newValue;
      	let startDate = parseISO(startDateStr); // Giữ nguyên T HH:MM
      	if (!isValid(startDate)) return;
      	
      	const adjustedStartDate = adjustDateForWeekend(startDate);
      	if (adjustedStartDate.getTime() !== startDate.getTime()) {
      		startDate = adjustedStartDate;
      		toast.info("Ngày bắt đầu mốc được dời sang Thứ Hai.", { duration: 2000 });
      	}
      	
      	if (startOfDay(startDate) < startOfDay(planStartDate)) {
        	startDate = planStartDate;
        	toast.warning("Ngày bắt đầu mốc không được trước ngày bắt đầu kế hoạch.");
      	}
        const newOffset = differenceInCalendarDays(startDate, planStartDate);
      	const currentDuration = Number(form.getValues(`mocThoigians.${index}.duration`)) || 1;
        const newEndDate = adjustDateForWeekend(addDays(startDate, currentDuration - 1));
        
        currentMeta.offset = newOffset;
        currentMeta.duration = currentDuration;
        form.setValue(`mocThoigians.${index}.NGAY_BATDAU`, format(startDate, DATE_FORMAT), { shouldValidate: true });
        form.setValue(`mocThoigians.${index}.NGAY_KETTHUC`, format(newEndDate, DATE_FORMAT), { shouldValidate: true });

      } else if (fieldType === 'duration') {
        duration = Number(newValue) || 1;
        if (duration < 1) duration = 1;
      	let startDate = parseISO(startDateStr);
      	if (!isValid(startDate)) return; // Cần ngày bắt đầu
        
      	const newEndDate = adjustDateForWeekend(addDays(startDate, duration - 1));
        
      	currentMeta.duration = duration;
      	form.setValue(`mocThoigians.${index}.duration`, duration, { shouldValidate: true });
      	form.setValue(`mocThoigians.${index}.NGAY_KETTHUC`, format(newEndDate, DATE_FORMAT), { shouldValidate: true });

      } else if (fieldType === 'end') {
        endDateStr = newValue;
      	let endDate = parseISO(endDateStr); // Giữ nguyên T HH:MM
      	if (!isValid(endDate)) return;
      	
      	const adjustedEndDate = adjustDateForWeekend(endDate);
      	if (adjustedEndDate.getTime() !== endDate.getTime()) {
      		endDate = adjustedEndDate;
      		toast.info("Ngày kết thúc mốc được dời sang Thứ Hai.", { duration: 2000 });
      	}
      	
      	let startDate = parseISO(startDateStr);
      	if (!isValid(startDate)) return; // Cần ngày bắt đầu
        
      	if (endDate < startDate) {
        	endDate = startDate;
      	}
        
      	const newDuration = differenceInCalendarDays(endDate, startDate) + 1;
      	currentMeta.duration = newDuration;
      	form.setValue(`mocThoigians.${index}.duration`, newDuration, { shouldValidate: true });
      	form.setValue(`mocThoigians.${index}.NGAY_KETTHUC`, format(endDate, DATE_FORMAT), { shouldValidate: true });
      }

      // Cập nhật metadata và kích hoạt "Domino"
      newMetadataArray[index] = currentMeta;
      if (!templateId || isEditMode) {
      	const newOriginalMeta = [...originalTemplateMetadata];
      	newOriginalMeta[index] = currentMeta;
      	setOriginalTemplateMetadata(newOriginalMeta);
      }
      cascadeMilestoneChanges(index, newMetadataArray);

    } catch (e) {
      console.error(`Error during date cascade at index ${index}:`, e);
      toast.error("Có lỗi xảy ra khi tự động cập nhật ngày.");
    }
  };


  // Hàm thêm mốc thời gian (Không đổi)
  const addMilestone = (index = -1) => {
    const currentMilestones = form.getValues('mocThoigians');
    let newOffset = 0;
    let newDuration = 1;
    const insertIndex = index === -1 ? currentMilestones.length : index;

    if (insertIndex > 0) {
      const prevMeta = milestoneMetadata[insertIndex - 1];
      if (prevMeta) {
        newOffset = (prevMeta.offset || 0) + (prevMeta.duration || 0);
      }
    }

    const planStartDateStr = form.getValues('NGAY_BATDAU');
    let newStartDateStr = '';
    let newEndDateStr = '';

    if (planStartDateStr && isValid(parseISO(planStartDateStr))) {
      const planStartDate = parseISO(planStartDateStr);
      let newStartDate = addDays(planStartDate, newOffset);
      newStartDate = adjustDateForWeekend(newStartDate);
      let newEndDate = addDays(newStartDate, newDuration - 1);
      newEndDate = adjustDateForWeekend(newEndDate);
      
      newStartDateStr = format(newStartDate, DATE_FORMAT);
      newEndDateStr = format(newEndDate, DATE_FORMAT);
    } else if (insertIndex > 0) {
      const prevEndDateStr = form.getValues(`mocThoigians.${insertIndex - 1}.NGAY_KETTHUC`);
      if(prevEndDateStr && isValid(parseISO(prevEndDateStr))) {
      	let newStartDate = adjustDateForWeekend(parseISO(prevEndDateStr));
      	let newEndDate = adjustDateForWeekend(addDays(newStartDate, newDuration - 1));
      	newStartDateStr = format(newStartDate, DATE_FORMAT);
    	newEndDateStr = format(newEndDate, DATE_FORMAT);
      }
    }

    const newMilestone = {
      id: crypto.randomUUID(),
      TEN_SUKIEN: `Mốc mới ${insertIndex + 1}`,
      NGAY_BATDAU: newStartDateStr,
      NGAY_KETTHUC: newEndDateStr,
      MOTA: '',
      VAITRO_THUCHIEN: null,
      duration: newDuration,
    };

    const newMeta = { offset: newOffset, duration: newDuration };
  	// Cập nhật form
    if (index === -1) {
      append(newMilestone);
    } else {
      insert(index, newMilestone);
    }
    
  	// Cập nhật metadata
  	setMilestoneMetadata(prev => {
  		const newArr = [...prev];
  		if (index === -1) {
  			newArr.push(newMeta);
  		} else {
  			newArr.splice(index, 0, newMeta);
  		}
  		return newArr;
  	});
    
  	// Cập nhật "base"
  	setOriginalTemplateMetadata(prev => {
  		const newArr = [...prev];
  		if (index === -1) {
  			newArr.push(newMeta);
  		} else {
  			newArr.splice(index, 0, newMeta);
  		}
  		return newArr;
  	});
    
  	if (index !== -1 && index < currentMilestones.length) {
  		setTimeout(() => {
  			const updatedMeta = [...milestoneMetadata];
  			updatedMeta.splice(index, 0, newMeta);
  			cascadeMilestoneChanges(index, updatedMeta);
  		}, 0);
  	} else {
  		syncPlanEndDate();
  	}
  };

  // Hàm xóa mốc thời gian (Không đổi)
  const removeMilestone = (index) => {
  	const currentMilestones = form.getValues('mocThoigians');
    remove(index);
    const newMetadataArray = [...milestoneMetadata];
    newMetadataArray.splice(index, 1);
    setMilestoneMetadata(newMetadataArray);
    
    const newOriginalMeta = [...originalTemplateMetadata];
    newOriginalMeta.splice(index, 1);
    setOriginalTemplateMetadata(newOriginalMeta);
   
    if (index < currentMilestones.length - 1 && index > 0) {
  		cascadeMilestoneChanges(index - 1, newMetadataArray);
    } else if (index === 0 && newMetadataArray.length > 0) {
  		cascadeMilestoneChanges(-1, newMetadataArray);
  	} else {
  		syncPlanEndDate();
  	}
  };


  // Tải dữ liệu ban đầu (Không đổi)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setMilestoneMetadata([]);
      setOriginalTemplateMetadata([]);
      
      try {
        let dataToLoad;
        let fetchedMocThoigians = [];
        let loadedMetadata = [];
        let planStartDateForCalc = null;

        if (isEditMode) {
          dataToLoad = await getThesisPlanById(planId);
          setPlanStatus(dataToLoad.TRANGTHAI);
          setTemplateBaseWeeks(dataToLoad.SO_TUAN_THUCHIEN || 12);
          fetchedMocThoigians = dataToLoad.moc_thoigians || [];
          if(dataToLoad.NGAY_BATDAU) planStartDateForCalc = parseISO(dataToLoad.NGAY_BATDAU);
          
          loadedMetadata = fetchedMocThoigians.map((m) => {
            const startDate = parseISO(m.NGAY_BATDAU);
            const endDate = parseISO(m.NGAY_KETTHUC);
            const offset = isValid(startDate) && isValid(planStartDateForCalc) ? differenceInCalendarDays(startDate, planStartDateForCalc) : 0;
            const duration = isValid(startDate) && isValid(endDate) ? differenceInCalendarDays(endDate, startDate) + 1 : 1;
            return { offset, duration };
          });
      	setOriginalTemplateMetadata(loadedMetadata);
          setIsManuallyEditingPlanEndDate(true);

        } else if (templateId) {
          const template = await getThesisPlanTemplateDetails(templateId);
          location.state = { ...location.state, templateData: template };
          setTemplateBaseWeeks(template.SO_TUAN_MACDINH || 12);
          
          fetchedMocThoigians = (template.mau_moc_thoigians || []).map(m => ({
            id: crypto.randomUUID(),
            TEN_SUKIEN: m.TEN_SUKIEN,
            MOTA: m.MOTA || '',
            NGAY_BATDAU: '',
            NGAY_KETTHUC: '',
            VAITRO_THUCHIEN: m.VAITRO_THUCHIEN_MACDINH || null,
            duration: m.THOI_LUONG || 1
          }));
          loadedMetadata = (template.mau_moc_thoigians || []).map(m => ({
            offset: m.OFFSET_BATDAU || 0,
            duration: m.THOI_LUONG || 1
          }));
      	setOriginalTemplateMetadata(loadedMetadata);
          dataToLoad = {
            HEDAOTAO: template.HEDAOTAO_MACDINH,
            SO_TUAN_THUCHIEN: template.SO_TUAN_MACDINH,
            TEN_DOT: '', NAMHOC: '', HOCKY: '', KHOAHOC: '',
            NGAY_BATDAU: '', NGAY_KETHUC: '',
            mocThoigians: fetchedMocThoigians
          };
          setIsManuallyEditingPlanEndDate(false);

        } else {
          const initialDuration = 1;
          const initialOffset = 0;
          fetchedMocThoigians = [{
            id: crypto.randomUUID(),
            TEN_SUKIEN: 'Mốc thời gian 1',
            NGAY_BATDAU: '', NGAY_KETTHUC: '', MOTA: '', VAITRO_THUCHIEN: null,
            duration: initialDuration
          }];
          loadedMetadata = [{ offset: initialOffset, duration: initialDuration }];
      	setOriginalTemplateMetadata(loadedMetadata);
          dataToLoad = {
            TEN_DOT: '', NAMHOC: '', HOCKY: '', KHOAHOC: '', HEDAOTAO: 'Cử nhân',
            SO_TUAN_THUCHIEN: 12,
            NGAY_BATDAU: '', NGAY_KETHUC: '',
            mocThoigians: fetchedMocThoigians
          };
          setIsManuallyEditingPlanEndDate(false);
        }

        // Reset form với dữ liệu đã chuẩn bị
        form.reset({
          ...(dataToLoad || {}),
          NGAY_BATDAU: dataToLoad?.NGAY_BATDAU ? format(parseISO(dataToLoad.NGAY_BATDAU), DATE_ONLY_FORMAT) : '',
          NGAY_KETHUC: dataToLoad?.NGAY_KETHUC ? format(parseISO(dataToLoad.NGAY_KETHUC), DATE_ONLY_FORMAT) : '',
          SO_TUAN_THUCHIEN: dataToLoad.SO_TUAN_THUCHIEN || 12,
          mocThoigians: fetchedMocThoigians.map((m, idx) => ({
            ...m,
            arrayId: crypto.randomUUID(),
            id: isEditMode ? m.ID : m.id,
            NGAY_BATDAU: m.NGAY_BATDAU && isValid(parseISO(m.NGAY_BATDAU)) ? format(parseISO(m.NGAY_BATDAU), DATE_FORMAT) : '',
            NGAY_KETTHUC: m.NGAY_KETTHUC && isValid(parseISO(m.NGAY_KETTHUC)) ? format(parseISO(m.NGAY_KETTHUC), DATE_FORMAT) : '',
            duration: loadedMetadata[idx]?.duration || 1,
        	  VAITRO_THUCHIEN: m.VAITRO_THUCHIEN || (m.VAITRO_THUCHIEN_MACDINH || null),
          }))
        });
      	setMilestoneMetadata(loadedMetadata);

    	if (dataToLoad?.NGAY_BATDAU && dataToLoad?.NGAY_KETHUC) {
    		try {
    			const days = differenceInCalendarDays(parseISO(dataToLoad.NGAY_KETHUC), parseISO(dataToLoad.NGAY_BATDAU)) + 1;
    			setApproximateDaysText(formatApproximateDays(days));
    		} catch (e) { setApproximateDaysText(''); }
    	}

      } catch (error) {
        console.error("Load data error:", error)
        toast.error(isEditMode ? "Lỗi tải chi tiết kế hoạch." : "Lỗi tải chi tiết bản mẫu.")
        navigate('/admin/thesis-plans')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, isEditMode, templateId, navigate]);


  // [MỚI] useEffect 1: Cập nhật NGAY_KETHUC khi NGAY_BATDAU hoặc SO_TUAN_THUCHIEN thay đổi
  useEffect(() => {
    // Nếu đây là một bản cập nhật do code (từ useEffect 2) gây ra, BỎ QUA
    if (isProgrammaticUpdate.current) return;

    // Chỉ chạy khi có ngày bắt đầu
    const startDateStr = form.getValues('NGAY_BATDAU'); // Lấy giá trị mới nhất
    if (startDateStr && isValid(parseISO(startDateStr))) {
      const planStartDate = parseISO(startDateStr);
      const newWeeks = Number(watchedWeeks) || 12; // Dùng giá trị đã watch

      const newPlanEndDate = adjustDateForWeekend(addDays(planStartDate, (newWeeks * 7) - 1));
      const newPlanEndDateStr = format(newPlanEndDate, DATE_ONLY_FORMAT);

      // [QUAN TRỌNG] Đặt cờ BẬT
      isProgrammaticUpdate.current = true;

      // Cập nhật ngày kết thúc
      form.setValue('NGAY_KETHUC', newPlanEndDateStr, { shouldValidate: true });
      
      // Cập nhật text xấp xỉ
      const days = differenceInCalendarDays(newPlanEndDate, planStartDate) + 1;
      setApproximateDaysText(formatApproximateDays(days));

      // Chạy logic co giãn
      scaleAllMilestones(startDateStr, newWeeks);

      // [QUAN TRỌNG] Tắt cờ sau khi render xong
      setTimeout(() => { isProgrammaticUpdate.current = false; }, 0);
    }
  }, [watchedStartDate, watchedWeeks, form, scaleAllMilestones, setApproximateDaysText]);

  // [MỚI] useEffect 2: Cập nhật SO_TUAN_THUCHIEN khi NGAY_KETHUC thay đổi (bởi người dùng)
  useEffect(() => {
    // Nếu đây là một bản cập nhật do code (từ useEffect 1) gây ra, BỎ QUA
    if (isProgrammaticUpdate.current) return;

    // Chỉ chạy khi người dùng tự sửa ngày KT
    if (!isManuallyEditingPlanEndDate) return;

    const startDateStr = form.getValues('NGAY_BATDAU'); // Lấy giá trị mới nhất
    if (startDateStr && watchedEndDate && isValid(parseISO(startDateStr)) && isValid(parseISO(watchedEndDate))) {
      try {
        const startDate = parseISO(startDateStr);
        const endDate = parseISO(watchedEndDate);
        const days = differenceInCalendarDays(endDate, startDate) + 1;
        const newWeeks = Math.ceil(days / 7);

        if (newWeeks > 0 && newWeeks !== Number(form.getValues('SO_TUAN_THUCHIEN'))) {
          // [QUAN TRỌNG] Đặt cờ BẬT
          isProgrammaticUpdate.current = true;

          form.setValue('SO_TUAN_THUCHIEN', newWeeks, { shouldValidate: true });
          setApproximateDaysText(formatApproximateDays(days)); // Cập nhật text xấp xỉ
          scaleAllMilestones(startDateStr, newWeeks);

          // [QUAN TRỌNG] Tắt cờ sau khi render xong
          setTimeout(() => { isProgrammaticUpdate.current = false; }, 0);
        } else if (newWeeks > 0) {
           // Nếu số tuần không đổi, vẫn cập nhật text xấp xỉ
           setApproximateDaysText(formatApproximateDays(days));
        }
      } catch (e) { console.error(e) }
    }
  }, [watchedEndDate, form, scaleAllMilestones, isManuallyEditingPlanEndDate, watchedStartDate, setApproximateDaysText]);


  // (useEffect cho scroll không đổi)
  useEffect(() => {
    const scrollSelector = "main.overflow-y-auto";
    let scrollContainerElement = null;
    const handleScroll = () => {
      if (!scrollContainerElement) return;
      setIsScrolled(scrollContainerElement.scrollTop > 0);
    };
    const setupScrollListener = () => {
      scrollContainerElement = document.querySelector(scrollSelector);
      if (scrollContainerElement) {
        scrollContainerElement.addEventListener('scroll', handleScroll);
        handleScroll();
      }
    };
    const timerId = setTimeout(setupScrollListener, 0);
    return () => {
      clearTimeout(timerId);
      if (scrollContainerElement) {
        scrollContainerElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);


  // Hàm kéo thả (Không đổi)
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = fields.findIndex(item => item.id === active.id);
      const newIndex = fields.findIndex(item => item.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedMetadata = arrayMove(milestoneMetadata, oldIndex, newIndex);
      	const reorderedOriginalMetadata = arrayMove(originalTemplateMetadata, oldIndex, newIndex);
      	
      	move(oldIndex, newIndex);
      	
      	setMilestoneMetadata(reorderedMetadata);
      	setOriginalTemplateMetadata(reorderedOriginalMetadata);

        cascadeMilestoneChanges(Math.min(oldIndex, newIndex) - 1, reorderedMetadata);
      }
    }
  }, [fields, move, milestoneMetadata, originalTemplateMetadata, cascadeMilestoneChanges]);

  // (Hàm onSubmit không đổi)
  const onSubmit = async (data) => {
    setIsSubmitting(true)
    const payload = {
      ...data,
      mocThoigians: data.mocThoigians.map(m => ({
        id: typeof m.id === 'number' ? m.id : null,
        TEN_SUKIEN: m.TEN_SUKIEN,
        NGAY_BATDAU: m.NGAY_BATDAU,
        NGAY_KETTHUC: m.NGAY_KETTHUC,
        MOTA: m.MOTA,
        VAITRO_THUCHIEN: m.VAITRO_THUCHIEN || null,
      }))
    }
    try {
      if (isEditMode) {
        await updateThesisPlan(planId, payload)
        toast.success("Cập nhật kế hoạch thành công!")
      } else {
        await createThesisPlan(payload)
        toast.success("Tạo kế hoạch mới thành công!")
      }
      navigate('/admin/thesis-plans')
    } catch (error) {
      console.error("Submit error:", error.response?.data || error)
      toast.error(error.response?.data?.message || "Thao tác thất bại.")
    } finally {
      setIsSubmitting(false)
    }
  }
  // (Hàm handlePreview không đổi)
  const handlePreview = async () => {
    const isValid = await form.trigger()
    if (!isValid) {
      toast.error("Vui lòng điền đầy đủ các trường thông tin bắt buộc và sửa lỗi.")
      return
    }
    setIsSubmitting(true)
    try {
      const formData = form.getValues()
      const payload = {
        ...formData,
        mocThoigians: formData.mocThoigians.map(m => ({
          ...m,
          id: typeof m.id === 'number' ? m.id : null,
          VAITRO_THUCHIEN: m.VAITRO_THUCHIEN || null
        }))
      }
      const blob = await previewNewPlan(payload)
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (error) {
      console.error("Preview error:", error.response?.data || error)
      toast.error(error.response?.data?.message || "Không thể tạo bản xem trước.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <PlanFormSkeleton />;
  }

  const isPlanStartDateLocked = isEditMode && !['Bản nháp', 'Chờ phê duyệt', 'Yêu cầu chỉnh sửa', 'Đã phê duyệt'].includes(planStatus);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4 md:p-8">
        {/* Header Section (Không đổi) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => navigate('/admin/thesis-plans')} className="mb-2">
              <ChevronLeft className="mr-2 h-4 w-4" /> Quay lại
            </Button>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button type="button" variant="secondary" onClick={handlePreview} disabled={isSubmitting} className="flex-1 sm:flex-none">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
            Xem trước
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Lưu thay đổi' : 'Tạo kế hoạch'}
          </Button>
        </div>
      </div>

        {/* --- BỐ CỤC (Không đổi) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <motion.div
            className={cn(
              "lg:col-span-1 lg:sticky",
            	"lg:top-[calc(var(--header-height,_60px)_+_2rem)]",
            	"lg:flex lg:flex-col lg:justify-center",
            	"transition-all duration-300 ease-out",
          	  isScrolled
            		? "lg:h-[calc(79vh_-_var(--header-height,_60px)_-_2rem)]"
            		: "lg:h-[calc(93vh_-_var(--header-height,_60px)_-_2rem)]"
          	)}
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
              <CardContent className="space-y-5 pt-2">
                <FormField name="TEN_DOT" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tên đợt*</FormLabel><FormControl><Input placeholder="VD: KLTN HK1, 2025-2026" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField name="NAMHOC" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Năm học*</FormLabel><FormControl><Input placeholder="2025-2026" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField name="HOCKY" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Học kỳ*</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger></FormControl><SelectContent><SelectItem key="1" value="1">1</SelectItem><SelectItem key="2" value="2">2</SelectItem><SelectItem key="3" value="3">Hè</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField name="KHOAHOC" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Khóa*</FormLabel><FormControl><Input placeholder="K13" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField name="HEDAOTAO" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Hệ ĐT*</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem key="CN" value="Cử nhân">Cử nhân</SelectItem><SelectItem key="KS" value="Kỹ sư">Kỹ sư</SelectItem><SelectItem key="TS" value="Thạc sỹ">Thạc sỹ</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                </div>
                <div className="grid grid-cols-1">
                  <FormField name="SO_TUAN_THUCHIEN" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số tuần thực hiện*</FormLabel>
                      <FormControl>
                        {/* [SỬA] Gỡ bỏ logic tính toán khỏi onBlur */}
                        <Input
                          type="number" min="1" placeholder="12"
                          {...field}
                          // [SỬA] Gắn onBlur gốc cho validation
                          onBlur={field.onBlur}
                          // [SỬA] onChange sẽ kích hoạt `watch` và `useEffect`
                          onChange={(e) => {
                          	field.onChange(e); // Cần thiết để RHF cập nhật
                          	setIsManuallyEditingPlanEndDate(false); // Vẫn giữ logic này
                          	// Toàn bộ logic tính toán đã được chuyển lên useEffect 1
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        {templateId && !isEditMode ? 'Dùng để tự động chia ngày khi dùng mẫu.' : 'Số tuần thực tế.'}
                        <span className="text-sky-600 ml-2 font-medium">{approximateDaysText}</span>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField name="NGAY_BATDAU" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày bắt đầu*</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          disabled={isPlanStartDateLocked}
                          // [SỬA] onBlur chỉ còn dùng để "dọn dẹp"
                          onBlur={(e) => {
                          	field.onBlur(e);
                          	// [GIỮ NGUYÊN] Logic "dọn dẹp" ngày và set cờ
                          	const adjustedDate = adjustDateForWeekend(parseISO(e.target.value));
                          	const adjustedDateStr = format(adjustedDate, DATE_ONLY_FORMAT);
                          	
                          	if (e.target.value !== adjustedDateStr) {
                          		toast.info("Ngày bắt đầu đã được dời sang Thứ Hai.", { duration: 2000 });
                          		field.onChange(adjustedDateStr); // Cập nhật lại form
                          	}
                          	setIsManuallyEditingPlanEndDate(false);
                          	// [XÓA] Logic scaleAllMilestones đã được chuyển lên useEffect 1
                          }}
                        />
                      </FormControl>
                      {isPlanStartDateLocked && <FormDescription className="text-destructive">Không thể sửa ngày bắt đầu khi kế hoạch đang chạy.</FormDescription>}
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField name="NGAY_KETHUC" control={form.control} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày kết thúc*</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          // [GIỮ NGUYÊN] onFocus rất quan trọng
                          onFocus={() => setIsManuallyEditingPlanEndDate(true)}
                          // [SỬA] onBlur chỉ còn dùng để "dọn dẹp"
                          onBlur={(e) => {
                          	field.onBlur(e);
                          	// [GIỮ NGUYÊN] Logic "dọn dẹp" ngày
                          	const newEndDateStr = e.target.value;
                          	const adjustedEndDate = adjustDateForWeekend(parseISO(newEndDateStr));
                          	const adjustedEndDateStr = format(adjustedEndDate, DATE_ONLY_FORMAT);
                          	
                          	if (newEndDateStr !== adjustedEndDateStr) {
                          		toast.info("Ngày kết thúc đã được dời sang Thứ Hai.", { duration: 2000 });
                          		field.onChange(adjustedEndDateStr); // Cập nhật lại form
                          	}
                          	// [XÓA] Toàn bộ logic tính toán 2 chiều đã được chuyển lên useEffect 2
                          }}
                        />
                        </FormControl>
                        <FormDescription>Tự động cập nhật. Có thể sửa.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}/>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Cột phải: Mốc thời gian (Không đổi) */}
            <motion.div
              className="lg:col-span-2 space-y-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
            >
              <Card className="border-blue-200 dark:border-blue-800 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <CardTitle className="text-lg font-semibold">Mốc thời gian ({fields.length})</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => addMilestone(-1)}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Thêm mục
                  </Button>
                </CardHeader>
               <CardContent className="pt-2">
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={fields.map(field => field.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-4">
                        {fields.map((field, index) => (
                          <div key={field.arrayId} className="group relative pl-7">
                            <SortableItemWrapper id={field.id}>
                              <MilestoneItem
                                index={index}
                                field={field}
                              	remove={() => removeMilestone(index)}
                              	form={form}
                              	onMilestoneChange={handleMilestoneChange}
                              />
                            </SortableItemWrapper>
                            <div className="w-full h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                              	className="h-6 w-6 p-0 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                              	onClick={() => addMilestone(index + 1)}
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
  )
}