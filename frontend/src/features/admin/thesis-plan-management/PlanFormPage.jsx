import React, { useState, useEffect, useCallback, useId } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format, parseISO, addDays, getDay, startOfDay, isValid, differenceInCalendarDays, isSaturday, isSunday } from 'date-fns'
import { vi } from 'date-fns/locale'
import { motion } from 'framer-motion' // Đã import
import { createThesisPlan, updateThesisPlan, getThesisPlanById, previewNewPlan, getThesisPlanTemplateDetails } from '../../../api/thesisPlanService'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
// ScrollArea không còn cần thiết
// import { ScrollArea } from '@/components/ui/scroll-area' 
import { Loader2, PlusCircle, Trash2, Eye, ChevronLeft, GripVertical, Info } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// --- Schema (Logic validation không đổi) ---
// (Giữ nguyên schema validation)
function adjustDateForWeekend(date) {
  if (!isValid(date)) return date;
  const dayOfWeek = getDay(date);
  if (dayOfWeek === 6) { // Thứ Bảy
    return addDays(date, 2); // Dời sang Thứ Hai
  }
  if (dayOfWeek === 0) { // Chủ Nhật
    return addDays(date, 1); // Dời sang Thứ Hai
  }
  return date; // Giữ nguyên nếu là ngày trong tuần
}
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
).refine(
  (data) => {
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

// --- MilestoneItem (Không đổi) ---
const MilestoneItem = React.forwardRef(({ index, field, remove, form, handleProps, onDateBlur, style, ...props }, ref) => {
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

      <div className="col-span-6">
        <FormField
          name={`mocThoigians.${index}.NGAY_BATDAU`}
          control={form.control}
          render={({ field: fld }) => (
            <FormItem>
              <FormLabel className="text-sm">Bắt đầu*</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...fld} onBlur={(e) => { fld.onBlur(e); onDateBlur(index, 'start', e.target.value); }} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>
      <div className="col-span-6">
        <FormField
          name={`mocThoigians.${index}.NGAY_KETTHUC`}
          control={form.control}
          render={({ field: fld }) => (
            <FormItem>
              <FormLabel className="text-sm">Kết thúc*</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...fld} onBlur={(e) => { fld.onBlur(e); onDateBlur(index, 'end', e.target.value); }} />
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
      <div className="flex items-center justify-between">
          <div>
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-4 w-80 mt-1" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <Card className="lg:col-span-1">
              <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
              <CardContent className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
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

// Component chính của trang biểu mẫu
export default function PlanFormPage() {
  // --- (Toàn bộ logic (hooks, state, useEffect, các hàm handle...) giữ nguyên, không thay đổi) ---
  const { planId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const templateId = location.state?.templateId
  const isEditMode = !!planId
  const [isLoading, setIsLoading] = useState(isEditMode || !!templateId)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [templateData, setTemplateData] = useState(null)
  const [userModifiedMilestoneDates, setUserModifiedMilestoneDates] = useState({})
  const [originalMilestoneDates, setOriginalMilestoneDates] = useState([]);
  const [isManuallyEditingEndDate, setIsManuallyEditingEndDate] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const form = useForm({
    resolver: zodResolver(planSchema),
    defaultValues: {
      TEN_DOT: '',
      NAMHOC: '',
      HOCKY: '',
      KHOAHOC: '',
      HEDAOTAO: 'Cử nhân',
      SO_TUAN_THUCHIEN: 12,
      NGAY_BATDAU: '',
      NGAY_KETHUC: '',
      mocThoigians: [{ id: crypto.randomUUID(), TEN_SUKIEN: '', NGAY_BATDAU: '', NGAY_KETTHUC: '', MOTA: '', VAITRO_THUCHIEN: null }]
    }
  })

  const { fields, append, remove, move, insert } = useFieldArray({
    control: form.control,
    name: "mocThoigians",
    keyName: "arrayId"
  })
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  // ... (Tất cả các hàm logic handle... và useEffect giữ nguyên y hệt) ...
  const handleStartDateChange = useCallback(
    (selectedDateStr) => {
      if (!selectedDateStr || !templateData || isEditMode) return;
      try {
        let planStartDate = startOfDay(parseISO(selectedDateStr));

        const adjustedStartDate = adjustDateForWeekend(planStartDate);
        if (adjustedStartDate !== planStartDate) {
          planStartDate = adjustedStartDate;
          const adjustedStartDateStr = format(planStartDate, 'yyyy-MM-dd');
          form.setValue('NGAY_BATDAU', adjustedStartDateStr, { shouldValidate: true });
          toast.info("Ngày bắt đầu đã được tự động dời sang Thứ Hai.", { duration: 2000 });
        }

        const newTotalWeeks = Number(form.getValues('SO_TUAN_THUCHIEN')) || 0;
        const templateTotalWeeks = templateData.SO_TUAN_MACDINH || 12;

        if (newTotalWeeks <= 0) return;

        const scaleFactor = (newTotalWeeks * 7) / (templateTotalWeeks * 7);

        let planEndDate = addDays(planStartDate, (newTotalWeeks * 7) - 1);
        planEndDate = adjustDateForWeekend(planEndDate);

        if (!isManuallyEditingEndDate) {
            form.setValue('NGAY_KETHUC', format(planEndDate, 'yyyy-MM-dd'), { shouldValidate: true });
        }

        const newOriginalDates = [];
        (templateData.mau_moc_thoigians || []).forEach((milestone, index) => {
          if (!userModifiedMilestoneDates[index]) {
            
            const scaledOffset = Math.round(milestone.OFFSET_BATDAU * scaleFactor);
            const scaledDuration = Math.round(milestone.THOI_LUONG * scaleFactor) || 1;
            
            let eventStartDate = addDays(planStartDate, scaledOffset);
            eventStartDate = adjustDateForWeekend(eventStartDate);
            let eventEndDate = addDays(eventStartDate, scaledDuration - 1);
            eventEndDate = adjustDateForWeekend(eventEndDate);

            if (eventEndDate > planEndDate) {
                eventEndDate = planEndDate;
            }
            if (eventStartDate > eventEndDate) {
                eventStartDate = eventEndDate;
            }

            const dateFormat = "yyyy-MM-dd'T'HH:mm";
            const startStr = format(eventStartDate, dateFormat);
            const endStr = format(eventEndDate, dateFormat);

            form.setValue(`mocThoigians.${index}.NGAY_BATDAU`, startStr, { shouldValidate: true })
            form.setValue(`mocThoigians.${index}.NGAY_KETTHUC`, endStr, { shouldValidate: true })
            form.setValue(`mocThoigians.${index}.VAITRO_THUCHIEN`, milestone.VAITRO_THUCHIEN_MACDINH || null, { shouldValidate: false });
            newOriginalDates[index] = { start: eventStartDate, end: eventEndDate };
          } else {
            const currentStart = form.getValues(`mocThoigians.${index}.NGAY_BATDAU`);
            const currentEnd = form.getValues(`mocThoigians.${index}.NGAY_KETTHUC`);
            newOriginalDates[index] = { 
                start: currentStart && isValid(parseISO(currentStart)) ? parseISO(currentStart) : null, 
                end: currentEnd && isValid(parseISO(currentEnd)) ? parseISO(currentEnd) : null
            };
            const currentRole = form.getValues(`mocThoigians.${index}.VAITRO_THUCHIEN`);
            form.setValue(`mocThoigians.${index}.VAITRO_THUCHIEN`, currentRole ?? null, { shouldValidate: false });
          }
        })
        setOriginalMilestoneDates(newOriginalDates);
      } catch (e) {
        console.error("Error calculating dates:", e)
      }
    },
    [templateData, isEditMode, form, userModifiedMilestoneDates, isManuallyEditingEndDate]
  )
  
  const watchedStartDate = form.watch('NGAY_BATDAU');
  const watchedSoTuan = form.watch('SO_TUAN_THUCHIEN'); 

  useEffect(() => {
    const startDate = watchedStartDate || form.getValues('NGAY_BATDAU');
    if(startDate && templateData && !isEditMode) {
        handleStartDateChange(startDate);
    }
  }, [watchedStartDate, watchedSoTuan, handleStartDateChange, templateData, isEditMode, form]);

  const watchedMilestones = form.watch('mocThoigians');
  useEffect(() => {
    if (isManuallyEditingEndDate || templateId) return; 

    if (watchedMilestones && watchedMilestones.length > 0) {
      let latestEndDate = null;
      for (const moc of watchedMilestones) {
        const endDateStr = moc?.NGAY_KETTHUC;
        if (endDateStr) {
          try {
            const endDate = parseISO(endDateStr);
            if (isValid(endDate)) {
              if (!latestEndDate || endDate > latestEndDate) {
                latestEndDate = endDate;
              }
            }
          } catch (e) { /* ignore invalid dates */ }
        }
      }
      if (latestEndDate && isValid(latestEndDate)) {
          const planEndDate = adjustDateForWeekend(latestEndDate);
          const latestEndDateStr = format(planEndDate, 'yyyy-MM-dd');
        const currentPlanEndDateStr = form.getValues('NGAY_KETHUC');
        if (currentPlanEndDateStr !== latestEndDateStr) {
          form.setValue('NGAY_KETHUC', latestEndDateStr, { shouldValidate: true });
        }
      }
    }
  }, [watchedMilestones, form, isManuallyEditingEndDate, templateId]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setUserModifiedMilestoneDates({})
      setOriginalMilestoneDates([]);
      try {
        let dataToLoad
        let fetchedMocThoigians = []
        let initialOriginalDates = [];
        if (isEditMode) {
          dataToLoad = await getThesisPlanById(planId)
          fetchedMocThoigians = dataToLoad.moc_thoigians || []
          const modifiedDatesState = {};
          fetchedMocThoigians.forEach((m, index) => {
            modifiedDatesState[index] = true;
            try {
                const start = m.NGAY_BATDAU ? parseISO(m.NGAY_BATDAU) : null;
                const end = m.NGAY_KETTHUC ? parseISO(m.NGAY_KETTHUC) : null;
                initialOriginalDates[index] = { start: isValid(start) ? start : null, end: isValid(end) ? end : null };
            } catch { initialOriginalDates[index] = { start: null, end: null }; }
          })
          setUserModifiedMilestoneDates(modifiedDatesState);
            setIsManuallyEditingEndDate(true);

        } else if (templateId) {
          const template = await getThesisPlanTemplateDetails(templateId)
          setTemplateData(template)
          fetchedMocThoigians = (template.mau_moc_thoigians || []).map(m => ({
            id: crypto.randomUUID(),
            ID_MAU_MOC: m.ID_MAU_MOC,
            TEN_SUKIEN: m.TEN_SUKIEN,
            MOTA: m.MOTA || '',
            NGAY_BATDAU: '',
            NGAY_KETTHUC: '',
            VAITRO_THUCHIEN: m.VAITRO_THUCHIEN_MACDINH || null,
            _templateOffset: m.OFFSET_BATDAU,
            _templateDuration: m.THOI_LUONG
          }))
          dataToLoad = {
            HEDAOTAO: template.HEDAOTAO_MACDINH,
            SO_TUAN_THUCHIEN: template.SO_TUAN_MACDINH,
            TEN_DOT: '', NAMHOC: '', HOCKY: '', KHOAHOC: '',
            NGAY_BATDAU: '', NGAY_KETHUC: '',
            mocThoigians: fetchedMocThoigians
          }
            setIsManuallyEditingEndDate(false);

        } else {
          form.reset({
            TEN_DOT: '', NAMHOC: '', HOCKY: '', KHOAHOC: '', HEDAOTAO: 'Cử nhân',
            SO_TUAN_THUCHIEN: 12,
            NGAY_BATDAU: '', NGAY_KETHUC: '',
            mocThoigians: [{ id: crypto.randomUUID(), arrayId: crypto.randomUUID(), TEN_SUKIEN: '', NGAY_BATDAU: '', NGAY_KETTHUC: '', MOTA: '', VAITRO_THUCHIEN: null }]
          })
          setOriginalMilestoneDates([]);
          setIsLoading(false)
          setIsManuallyEditingEndDate(false);
          return
        }

        form.reset({
          ...(dataToLoad || {}),
          NGAY_BATDAU: dataToLoad?.NGAY_BATDAU ? format(parseISO(dataToLoad.NGAY_BATDAU), 'yyyy-MM-dd') : '',
          NGAY_KETHUC: dataToLoad?.NGAY_KETHUC ? format(parseISO(dataToLoad.NGAY_KETHUC), 'yyyy-MM-dd') : '',
          SO_TUAN_THUCHIEN: dataToLoad.SO_TUAN_THUCHIEN ?? (templateId ? templateData.SO_TUAN_MACDINH : 12),
          mocThoigians: fetchedMocThoigians.map(m => ({
            ...m,
            arrayId: crypto.randomUUID(),
            id: isEditMode ? m.ID : m.id,
            ID_MAU_MOC: isEditMode ? m.ID : null,
            NGAY_BATDAU: m.NGAY_BATDAU && isValid(parseISO(m.NGAY_BATDAU)) ? format(parseISO(m.NGAY_BATDAU), "yyyy-MM-dd'T'HH:mm") : '',
            NGAY_KETTHUC: m.NGAY_KETTHUC && isValid(parseISO(m.NGAY_KETTHUC)) ? format(parseISO(m.NGAY_KETTHUC), "yyyy-MM-dd'T'HH:mm") : '',
            VAITRO_THUCHIEN: m.VAITRO_THUCHIEN || (m.VAITRO_THUCHIEN_MACDINH || null)
          }))
        })
        setOriginalMilestoneDates(initialOriginalDates);

      } catch (error) {
        console.error("Load data error:", error)
        toast.error(isEditMode ? "Lỗi tải chi tiết kế hoạch." : "Lỗi tải chi tiết bản mẫu.")
        navigate('/admin/thesis-plans')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [planId, isEditMode, templateId, form, navigate]);
  useEffect(() => {
    const scrollSelector = "main.overflow-y-auto";
    let scrollContainerElement = null;

    const handleScroll = () => {
      if (!scrollContainerElement) return;

      const scrollTop = scrollContainerElement.scrollTop;
      console.log('Scroll Top:', scrollTop);
      const newIsScrolled = scrollTop > 0;
      setIsScrolled(currentIsScrolled => {
        if (newIsScrolled !== currentIsScrolled) {
          console.log('>>> State isScrolled thay đổi:', newIsScrolled);
          return newIsScrolled;
        }
        return currentIsScrolled;
      });
    };

    const setupScrollListener = () => {
        scrollContainerElement = document.querySelector(scrollSelector);
        if (scrollContainerElement) {
            console.log('Tìm thấy vùng cuộn:', scrollContainerElement);
            scrollContainerElement.addEventListener('scroll', handleScroll);
            handleScroll();
        } else {
             console.warn(`!!! KHÔNG tìm thấy vùng cuộn với selector: '${scrollSelector}' khi component mount.`);
        }
    };
    const timerId = setTimeout(setupScrollListener, 0);
    return () => {
      clearTimeout(timerId);
      if (scrollContainerElement) {
        console.log('Gỡ bỏ listener khỏi:', scrollContainerElement);
        scrollContainerElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);
  const handleMilestoneDateBlur = (index, type, newValueStr) => {
    setUserModifiedMilestoneDates(prev => ({ ...prev, [index]: true }));

    const milestones = form.getValues('mocThoigians');
    const currentMilestone = milestones[index];
    const originalDates = originalMilestoneDates[index];

    if (!currentMilestone) return;

    try {
      let currentDate = parseISO(newValueStr);
      if (!isValid(currentDate)) return;
      
      const dateFormat = "yyyy-MM-dd'T'HH:mm";
      
      const adjustedDate = adjustDateForWeekend(currentDate);
      if (adjustedDate !== currentDate) {
          currentDate = adjustedDate;
          const adjustedDateStr = format(currentDate, dateFormat);
          form.setValue(`mocThoigians.${index}.${type === 'start' ? 'NGAY_BATDAU' : 'NGAY_KETTHUC'}`, adjustedDateStr, { shouldValidate: true });
          toast.info("Ngày đã được tự động dời sang Thứ Hai.", { duration: 2000 });
      }

      let newStartDate = type === 'start' ? currentDate : null;
      let newEndDate = type === 'end' ? currentDate : null;
      let dayDifference = 0;

      const originalStart = originalDates?.[index]?.start && isValid(originalDates[index].start) ? originalDates[index].start : null;
      const originalEnd = originalDates?.[index]?.end && isValid(originalDates[index].end) ? originalDates[index].end : null;

      if (type === 'start') {
        if (originalStart && originalEnd) {
          const originalDurationDays = differenceInCalendarDays(originalEnd, originalStart);
          const calculatedEndDate = addDays(newStartDate, originalDurationDays);
          newEndDate = adjustDateForWeekend(calculatedEndDate);
          form.setValue(`mocThoigians.${index}.NGAY_KETTHUC`, format(newEndDate, dateFormat), { shouldValidate: true });
        } else {
            const existingEndDateStr = form.getValues(`mocThoigians.${index}.NGAY_KETTHUC`);
            newEndDate = existingEndDateStr && isValid(parseISO(existingEndDateStr)) ? parseISO(existingEndDateStr) : null;
            if (!newEndDate || newEndDate < newStartDate) {
                newEndDate = newStartDate;
                form.setValue(`mocThoigians.${index}.NGAY_KETTHUC`, format(newEndDate, dateFormat), { shouldValidate: true });
            }
        }
        if(originalStart){
            dayDifference = differenceInCalendarDays(startOfDay(newStartDate), startOfDay(originalStart));
        }

      } else { // type === 'end'
        const existingStartDateStr = form.getValues(`mocThoigians.${index}.NGAY_BATDAU`);
        newStartDate = existingStartDateStr && isValid(parseISO(existingStartDateStr)) ? parseISO(existingStartDateStr) : null;
        if (!newStartDate || newEndDate < newStartDate) {
            newStartDate = newEndDate;
            form.setValue(`mocThoigians.${index}.NGAY_BATDAU`, format(newStartDate, dateFormat), { shouldValidate: true });
        }
        if(originalEnd){
            dayDifference = differenceInCalendarDays(startOfDay(newEndDate), startOfDay(originalEnd));
        }
      }

      const newOriginals = [...originalMilestoneDates];
      newOriginals[index] = { start: newStartDate, end: newEndDate };

        if (dayDifference !== 0) {
        const modifiedStateUpdates = {};
        for (let i = index + 1; i < milestones.length; i++) {
            if (!userModifiedMilestoneDates[i] || userModifiedMilestoneDates[index]) {
                const subsequentOriginal = originalMilestoneDates[i];
                if (!subsequentOriginal || !subsequentOriginal.start || !subsequentOriginal.end || !isValid(subsequentOriginal.start) || !isValid(subsequentOriginal.end)) {
                    console.warn(`Skipping cascade for index ${i} due to missing or invalid original dates.`);
                    continue;
                }

                let cascadedStartDate = addDays(subsequentOriginal.start, dayDifference);
                cascadedStartDate = adjustDateForWeekend(cascadedStartDate);
                let cascadedEndDate = addDays(subsequentOriginal.end, dayDifference);
                cascadedEndDate = adjustDateForWeekend(cascadedEndDate);

                form.setValue(`mocThoigians.${i}.NGAY_BATDAU`, format(cascadedStartDate, dateFormat), { shouldValidate: true });
                form.setValue(`mocThoigians.${i}.NGAY_KETTHUC`, format(cascadedEndDate, dateFormat), { shouldValidate: true });

                newOriginals[i] = { start: cascadedStartDate, end: cascadedEndDate };
                modifiedStateUpdates[i] = true;
            }
        }
          setUserModifiedMileStoneDates(prev => ({ ...prev, ...modifiedStateUpdates }));
      }
      setOriginalMilestoneDates(newOriginals);

    } catch (e) {
      console.error(`Error during date cascade at index ${index}:`, e);
      toast.error("Có lỗi xảy ra khi tự động cập nhật ngày.");
    }
  };

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
        const oldIndex = fields.findIndex(item => item.id === active.id);
        const newIndex = fields.findIndex(item => item.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
            const reorderedOriginalDates = arrayMove(originalMilestoneDates, oldIndex, newIndex);
            setOriginalMilestoneDates(reorderedOriginalDates);

            const currentModifiedStatus = { ...userModifiedMilestoneDates };
            const newModifiedStatus = {};
            const movedFieldsTemp = arrayMove([...fields], oldIndex, newIndex);

            movedFieldsTemp.forEach((field, idx) => {
                const originalFieldDataIndex = fields.findIndex(f => f.id === field.id);
                if (currentModifiedStatus[originalFieldDataIndex]) {
                    newModifiedStatus[idx] = true;
                }
            });
            setUserModifiedMilestoneDates(newModifiedStatus);

            move(oldIndex, newIndex);
        }
    }
  }, [fields, move, originalMilestoneDates, userModifiedMilestoneDates]);

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

  const handlePreview = async () => {
    const isValid = await form.trigger()
    if (!isValid) {
      toast.error("Vui lòng điền đầy đủ các trường thông tin bắt buộc và sửa lỗi.")
      const firstErrorField = Object.keys(form.formState.errors)[0]
      if (firstErrorField) {
        try {
          const fieldPath = firstErrorField.includes('.') ? firstErrorField : firstErrorField
          form.setFocus(fieldPath)
        } catch (e) {
          console.warn("Could not focus on field:", firstErrorField)
        }
      }
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
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Preview error:", error.response?.data || error)
      toast.error(error.response?.data?.message || "Không thể tạo bản xem trước.")
    } finally {
      setIsSubmitting(false)
    }
  }
  // --- (Kết thúc logic không đổi) ---


  if (isLoading) {
    return <PlanFormSkeleton />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4 md:p-8">
        {/* Header Section (Không đổi) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/thesis-plans')}
              className="mb-2"
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Quay lại
            </Button>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              onClick={handlePreview}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              Xem trước
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Lưu thay đổi' : 'Tạo kế hoạch'}
            </Button>
          </div>
        </div>

        {/* --- BỐ CỤC ĐÃ CẬP NHẬT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <motion.div
            className={cn(
              "lg:col-span-1 lg:sticky",
              "lg:top-[calc(theme(spacing.14)_+_theme(spacing.8))]",
              "lg:flex lg:flex-col lg:justify-center",
              "transition-all duration-300 ease-out",
              isScrolled
                ? "lg:h-[calc(78vh_-_theme(spacing.14)_-_theme(spacing.8))]"
                : "lg:h-[calc(100vh_-_theme(spacing.14)_-_theme(spacing.8))]"
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
                  <FormField
                    name="HOCKY"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Học kỳ*</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem key="1" value="1">1</SelectItem>
                            <SelectItem key="2" value="2">2</SelectItem>
                            <SelectItem key="3" value="3">Hè</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField name="KHOAHOC" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Khóa*</FormLabel><FormControl><Input placeholder="K13" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                  <FormField name="HEDAOTAO" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Hệ ĐT*</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem key="CN" value="Cử nhân">Cử nhân</SelectItem><SelectItem key="KS" value="Kỹ sư">Kỹ sư</SelectItem><SelectItem key="TS" value="Thạc sỹ">Thạc sỹ</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                </div>
                <div className="grid grid-cols-1">
                  <FormField
                      name="SO_TUAN_THUCHIEN"
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Số tuần thực hiện*</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" placeholder="12" {...field} />
                          </FormControl>
                          <FormDescription>
                            Số tuần thực tế (ví dụ: 6, 7, 12). Dùng để tự động chia ngày khi dùng mẫu.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField name="NGAY_BATDAU" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Ngày bắt đầu*</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage />{templateId && !isEditMode && (<p className="text-xs text-amber-600">Ngày các mục sẽ tự tính.</p>)}</FormItem> )}/>
                <FormField name="NGAY_KETHUC" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Ngày kết thúc*</FormLabel><FormControl><Input type="date" {...field} onFocus={() => setIsManuallyEditingEndDate(true)} onBlur={(e) => { field.onBlur(e); setIsManuallyEditingEndDate(false); form.trigger('NGAY_KETHUC'); }} /></FormControl><FormDescription>Tự động cập nhật. Có thể sửa.</FormDescription><FormMessage /></FormItem> )}/>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Cột phải: Mốc thời gian (KHÔNG STICKY, KHÔNG SCROLL) */}
          <motion.div
            className="lg:col-span-2 space-y-4" // <-- Vẫn không sticky
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          >
            <Card className="border-blue-200 dark:border-blue-800 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg font-semibold">Mốc thời gian ({fields.length})</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      id: crypto.randomUUID(),
                      TEN_SUKIEN: '',
                      NGAY_BATDAU: '',
                      NGAY_KETTHUC: '',
                      MOTA: '',
                      VAITRO_THUCHIEN: null
                    })
                  }
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Thêm mục
                </Button>
              </CardHeader>
              <CardContent className="pt-2"> 
                {/* Đã bỏ ScrollArea */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={fields.map(field => field.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4"> 
                      {fields.map((field, index) => (
                        <div key={field.arrayId} className="group relative pl-7">
                          <SortableItemWrapper id={field.id}>
                            <MilestoneItem
                              index={index}
                              field={field}
                              remove={remove}
                              form={form}
                              onDateBlur={handleMilestoneDateBlur}
                            />
                          </SortableItemWrapper>
                          <div className="w-full h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                              onClick={() =>
                                insert(index + 1, {
                                  id: crypto.randomUUID(),
                                  arrayId: crypto.randomUUID(),
                                  TEN_SUKIEN: '',
                                  NGAY_BATDAU: '',
                                  NGAY_KETTHUC: '',
                                  MOTA: '',
                                  VAITRO_THUCHIEN: null
                                })
                              }
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