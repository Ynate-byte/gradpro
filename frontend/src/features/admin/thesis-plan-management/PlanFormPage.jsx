import React, { useState, useEffect, useCallback, useId } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
// ----- SỬA LOGIC: Import đầy đủ date-fns -----
import { format, parseISO, addDays, getDay, startOfDay, isValid, differenceInCalendarDays, isSaturday, isSunday } from 'date-fns'
import { vi } from 'date-fns/locale'
import { createThesisPlan, updateThesisPlan, getThesisPlanById, previewNewPlan, getThesisPlanTemplateDetails } from '../../../api/thesisPlanService'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, PlusCircle, Trash2, Eye, ChevronLeft, GripVertical } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Skeleton } from '@/components/ui/skeleton'

// ----- SỬA LOGIC: Thêm lại hàm adjustDateForWeekend -----
/**
 * Tự động điều chỉnh ngày sang Thứ Hai kế tiếp nếu là Thứ Bảy hoặc Chủ Nhật.
 * @param {Date} date - Ngày cần kiểm tra.
 * @returns {Date} - Ngày đã điều chỉnh (nếu cần).
 */
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

// ----- SỬA LOGIC: Giữ lại validation (Khóa) -----
// Hàm helper để kiểm tra ngày không phải cuối tuần
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
          MOTA: z.string().optional().nullable()
        })
        .refine(
          data => !data.NGAY_BATDAU || !data.NGAY_KETHUC || data.NGAY_KETTHUC >= data.NGAY_BATDAU,
          {
            message: "Ngày kết thúc của mục phải sau hoặc bằng ngày bắt đầu.",
            path: ["NGAY_KETTHUC"]
          }
        )
    )
    .min(1, "Phải có ít nhất một mốc thời gian.")
}).refine(
  data => !data.NGAY_BATDAU || !data.NGAY_KETHUC || data.NGAY_KETHUC >= data.NGAY_BATDAU,
  {
    message: "Ngày kết thúc kế hoạch phải sau hoặc bằng ngày bắt đầu.",
    path: ["NGAY_KETHUC"]
  }
).refine(
  (data) => {
    if (!data.NGAY_KETHUC || !data.mocThoigians || data.mocThoigians.length === 0) {
      return true;
    }
    let latestMilestoneEndDate = null;
    try {
      for (const moc of data.mocThoigians) {
        if (moc.NGAY_KETTHUC) {
          const endDate = parseISO(moc.NGAY_KETTHUC);
          if (isValid(endDate)) {
            if (!latestMilestoneEndDate || endDate > latestMilestoneEndDate) {
              latestMilestoneEndDate = endDate;
            }
          }
        }
      }
      if (!latestMilestoneEndDate) return true;
      const planEndDate = parseISO(data.NGAY_KETHUC);
      if (!isValid(planEndDate)) return true;
      return startOfDay(planEndDate) >= startOfDay(latestMilestoneEndDate);
    } catch (e) {
      return true;
    }
  },
  {
    message: "Ngày kết thúc kế hoạch không được sớm hơn ngày kết thúc của mốc thời gian cuối cùng.",
    path: ["NGAY_KETHUC"],
  }
);
// ----- KẾT THÚC SỬA LOGIC SCHEMA -----

// Component hiển thị mục mốc thời gian (Không thay đổi)
const MilestoneItem = React.forwardRef(({ index, field, remove, form, handleProps, onDateBlur, style, ...props }, ref) => {
  return (
    <div
      ref={ref}
      style={style}
      {...props}
      className="grid grid-cols-12 gap-x-4 gap-y-2 items-start p-4 border rounded-lg bg-background hover:shadow-md relative group"
    >
      <div
        {...handleProps}
        className="absolute -left-6 top-1/2 -translate-y-1/2 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity p-1 touch-none"
      >
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="col-span-12">
        <FormField
          name={`mocThoigians.${index}.TEN_SUKIEN`}
          control={form.control}
          render={({ field: fld }) => (
            <FormItem>
              <FormLabel>Nội dung (Mục {index + 1})*</FormLabel>
              <FormControl>
                <Input {...fld} />
              </FormControl>
              <FormMessage />
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
              <FormLabel>Mô tả</FormLabel>
              <FormControl>
                <Textarea {...fld} className="min-h-[60px] resize-y" />
              </FormControl>
              <FormMessage />
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
              <FormLabel>Bắt đầu*</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...fld} onBlur={(e) => { fld.onBlur(e); onDateBlur(index, 'start', e.target.value); }} />
              </FormControl>
              <FormMessage />
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
              <FormLabel>Kết thúc*</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...fld} onBlur={(e) => { fld.onBlur(e); onDateBlur(index, 'end', e.target.value); }} />
              </FormControl>
              <FormMessage />
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
        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
})
MilestoneItem.displayName = 'MilestoneItem'

// Component bọc cho mục có thể kéo thả (Không thay đổi)
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

// Component chính của trang biểu mẫu
export default function PlanFormPage() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const templateId = location.state?.templateId
  const isEditMode = !!planId
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [templateData, setTemplateData] = useState(null)
  const [userModifiedMilestoneDates, setUserModifiedMilestoneDates] = useState({})
  const [originalMilestoneDates, setOriginalMilestoneDates] = useState([]);
  const [isManuallyEditingEndDate, setIsManuallyEditingEndDate] = useState(false);

  const form = useForm({
    resolver: zodResolver(planSchema),
    defaultValues: {
      TEN_DOT: '',
      NAMHOC: '',
      HOCKY: '',
      KHOAHOC: '',
      HEDAOTAO: 'Cử nhân',
      NGAY_BATDAU: '',
      NGAY_KETHUC: '',
      mocThoigians: [{ id: crypto.randomUUID(), TEN_SUKIEN: '', NGAY_BATDAU: '', NGAY_KETTHUC: '', MOTA: '' }]
    }
  })

  const { fields, append, remove, move, insert } = useFieldArray({
    control: form.control,
    name: "mocThoigians",
    keyName: "arrayId"
  })

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  // ----- SỬA LOGIC: Tích hợp lại adjustDateForWeekend -----
  const handleStartDateChange = useCallback(
    (selectedDateStr) => {
      if (!selectedDateStr || !templateData || isEditMode) return
      try {
        let planStartDate = startOfDay(parseISO(selectedDateStr));

        // Tự động điều chỉnh ngày bắt đầu kế hoạch nếu trúng cuối tuần
        const adjustedStartDate = adjustDateForWeekend(planStartDate);
        if (adjustedStartDate !== planStartDate) {
            planStartDate = adjustedStartDate;
            const adjustedStartDateStr = format(planStartDate, 'yyyy-MM-dd');
            form.setValue('NGAY_BATDAU', adjustedStartDateStr, { shouldValidate: true });
            toast.info("Ngày bắt đầu đã được tự động dời sang Thứ Hai.", { duration: 2000 });
        }

        const planDurationWeeks = templateData.SO_TUAN_MACDINH || 12
        let planEndDate = addDays(planStartDate, planDurationWeeks * 7 - 1)
        planEndDate = adjustDateForWeekend(planEndDate); // Điều chỉnh ngày kết thúc dự kiến
        
        form.setValue('NGAY_KETHUC', format(planEndDate, 'yyyy-MM-dd'), { shouldValidate: true });

        const newOriginalDates = [];
        (templateData.mau_moc_thoigians || []).forEach((milestone, index) => {
          if (!userModifiedMilestoneDates[index]) {
            const { OFFSET_BATDAU, THOI_LUONG } = milestone
            let eventStartDate = addDays(planStartDate, OFFSET_BATDAU)
            eventStartDate = adjustDateForWeekend(eventStartDate); // Điều chỉnh
            let eventEndDate = addDays(eventStartDate, THOI_LUONG - 1)
            eventEndDate = adjustDateForWeekend(eventEndDate); // Điều chỉnh
            const dateFormat = "yyyy-MM-dd'T'HH:mm"
            const startStr = format(eventStartDate, dateFormat);
            const endStr = format(eventEndDate, dateFormat);
            form.setValue(`mocThoigians.${index}.NGAY_BATDAU`, startStr, { shouldValidate: true })
            form.setValue(`mocThoigians.${index}.NGAY_KETTHUC`, endStr, { shouldValidate: true })
            newOriginalDates[index] = { start: eventStartDate, end: eventEndDate };
          } else {
            const currentStart = form.getValues(`mocThoigians.${index}.NGAY_BATDAU`);
            const currentEnd = form.getValues(`mocThoigians.${index}.NGAY_KETTHUC`);
            newOriginalDates[index] = { start: parseISO(currentStart), end: parseISO(currentEnd) };
          }
        })
        setOriginalMilestoneDates(newOriginalDates);
      } catch (e) {
        console.error("Error calculating dates:", e)
      }
    },
    [templateData, isEditMode, form, userModifiedMilestoneDates]
  )

  const watchedStartDate = form.watch('NGAY_BATDAU')
  useEffect(() => {
    handleStartDateChange(watchedStartDate)
  }, [watchedStartDate, handleStartDateChange])

  // Logic tự động cập nhật NGAY_KETHUC (Không thay đổi)
  const watchedMilestones = form.watch('mocThoigians');
  useEffect(() => {
    if (isManuallyEditingEndDate) return;
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
        const currentPlanEndDateStr = form.getValues('NGAY_KETHUC');
        const latestEndDateStr = format(latestEndDate, 'yyyy-MM-dd');
        if (currentPlanEndDateStr !== latestEndDateStr) {
          form.setValue('NGAY_KETHUC', latestEndDateStr, { shouldValidate: true });
        }
      }
    }
  }, [watchedMilestones, form, isManuallyEditingEndDate]);


  // Logic useEffect loadData (Không thay đổi)
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
            } catch {
                initialOriginalDates[index] = { start: null, end: null };
            }
          })
          setUserModifiedMilestoneDates(modifiedDatesState);

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
            _templateOffset: m.OFFSET_BATDAU,
            _templateDuration: m.THOI_LUONG
          }))
          dataToLoad = {
            HEDAOTAO: template.HEDAOTAO_MACDINH,
            TEN_DOT: '',
            NAMHOC: '',
            HOCKY: '',
            KHOAHOC: '',
            NGAY_BATDAU: '',
            NGAY_KETHUC: '',
            mocThoigians: fetchedMocThoigians
          }
        } else {
          form.reset({
            TEN_DOT: '',
            NAMHOC: '',
            HOCKY: '',
            KHOAHOC: '',
            HEDAOTAO: 'Cử nhân',
            NGAY_BATDAU: '',
            NGAY_KETHUC: '',
            mocThoigians: [{ id: crypto.randomUUID(), TEN_SUKIEN: '', NGAY_BATDAU: '', NGAY_KETTHUC: '', MOTA: '' }]
          })
          setOriginalMilestoneDates([]);
          setIsLoading(false)
          return
        }
        form.reset({
          ...(dataToLoad || {}),
          NGAY_BATDAU: dataToLoad?.NGAY_BATDAU ? format(parseISO(dataToLoad.NGAY_BATDAU), 'yyyy-MM-dd') : '',
          NGAY_KETHUC: dataToLoad?.NGAY_KETHUC ? format(parseISO(dataToLoad.NGAY_KETHUC), 'yyyy-MM-dd') : '',
          mocThoigians: fetchedMocThoigians.map(m => ({
            ...m,
            arrayId: crypto.randomUUID(),
            id: isEditMode ? m.ID : m.id,
            ID_MAU_MOC: isEditMode ? m.ID : null,
            NGAY_BATDAU: m.NGAY_BATDAU && isValid(parseISO(m.NGAY_BATDAU)) ? format(parseISO(m.NGAY_BATDAU), "yyyy-MM-dd'T'HH:mm") : '',
            NGAY_KETTHUC: m.NGAY_KETTHUC && isValid(parseISO(m.NGAY_KETTHUC)) ? format(parseISO(m.NGAY_KETTHUC), "yyyy-MM-dd'T'HH:mm") : ''
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
  }, [planId, isEditMode, templateId, form, navigate])

  // ----- SỬA LOGIC: Tích hợp lại adjustDateForWeekend -----
  const handleMilestoneDateBlur = (index, type, newValueStr) => {
    setUserModifiedMilestoneDates(prev => ({ ...prev, [index]: true }));

    const milestones = form.getValues('mocThoigians');
    const currentMilestone = milestones[index];
    const originalDates = originalMilestoneDates[index];

    if (!currentMilestone) return;

    try {
      let currentDate = parseISO(newValueStr);
      if (!isValid(currentDate)) {
        console.warn(`Invalid date input at index ${index}: ${newValueStr}`);
        return;
      }
      
      const dateFormat = "yyyy-MM-dd'T'HH:mm";
      
      // Tự động điều chỉnh ngày vừa nhập nếu là cuối tuần
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

      const originalStart = originalDates?.start && isValid(originalDates.start) ? originalDates.start : null;
      const originalEnd = originalDates?.end && isValid(originalDates.end) ? originalDates.end : null;

      if (type === 'start') {
        if (originalStart && originalEnd) {
          const originalDurationDays = differenceInCalendarDays(originalEnd, originalStart);
          const calculatedEndDate = addDays(newStartDate, originalDurationDays);
          newEndDate = adjustDateForWeekend(calculatedEndDate); // Điều chỉnh ngày kết thúc
          form.setValue(`mocThoigians.${index}.NGAY_KETTHUC`, format(newEndDate, dateFormat), { shouldValidate: true });
        } else {
            const existingEndDateStr = form.getValues(`mocThoigians.${index}.NGAY_KETTHUC`);
            newEndDate = existingEndDateStr && isValid(parseISO(existingEndDateStr)) ? parseISO(existingEndDateStr) : null;
            if (!newEndDate) {
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
         if (!newStartDate) {
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
          const subsequentOriginal = originalMilestoneDates[i];
          if (!subsequentOriginal || !subsequentOriginal.start || !subsequentOriginal.end || !isValid(subsequentOriginal.start) || !isValid(subsequentOriginal.end)) {
            console.warn(`Skipping cascade for index ${i} due to missing or invalid original dates.`);
            continue;
          }

          let cascadedStartDate = addDays(subsequentOriginal.start, dayDifference);
          cascadedStartDate = adjustDateForWeekend(cascadedStartDate); // Điều chỉnh
          let cascadedEndDate = addDays(subsequentOriginal.end, dayDifference);
          cascadedEndDate = adjustDateForWeekend(cascadedEndDate); // Điều chỉnh

          form.setValue(`mocThoigians.${i}.NGAY_BATDAU`, format(cascadedStartDate, dateFormat), { shouldValidate: true });
          form.setValue(`mocThoigians.${i}.NGAY_KETTHUC`, format(cascadedEndDate, dateFormat), { shouldValidate: true });

          newOriginals[i] = { start: cascadedStartDate, end: cascadedEndDate };
          modifiedStateUpdates[i] = true;
        }
         setUserModifiedMilestoneDates(prev => ({ ...prev, ...modifiedStateUpdates }));
      }
      setOriginalMilestoneDates(newOriginals);
    } catch (e) {
      console.error(`Error during date cascade at index ${index}:`, e);
      toast.error("Có lỗi xảy ra khi tự động cập nhật ngày.");
    }
  };

  // Logic kéo thả (Không thay đổi)
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

  // Logic submit form (Không thay đổi)
  const onSubmit = async (data) => {
    setIsSubmitting(true)
    const payload = { ...data, mocThoigians: data.mocThoigians.map(m => ({ ...m, id: typeof m.id === 'number' ? m.id : null })) }
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

  // Logic xem trước (Không thay đổi)
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
          id: typeof m.id === 'number' ? m.id : null
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

  // Logic loading skeleton (Không thay đổi)
  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-64" />
      </div>
    )
  }

  // JSX Render (Giữ nguyên)
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4 md:p-8">
        <div className="flex items-center justify-between gap-4">
         <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/thesis-plans')}
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Quay lại
            </Button>
            <h1 className="text-3xl font-bold mt-2">
              {isEditMode ? 'Chỉnh sửa Kế hoạch' : 'Tạo Kế hoạch Khóa luận mới'}
            </h1>
            <p className="text-muted-foreground">
              Điền thông tin và các mốc thời gian quan trọng của đợt khóa luận.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handlePreview}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              Xem trước
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Lưu thay đổi' : 'Tạo kế hoạch'}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <Card className="lg:col-span-1 sticky top-[calc(theme(spacing.14)_+_theme(spacing.8))]">
            <CardHeader>
              <CardTitle>Thông tin chung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                name="TEN_DOT"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên đợt*</FormLabel>
                    <FormControl>
                      <Input placeholder="VD: KLTN HK1, 2025-2026" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="NAMHOC"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Năm học*</FormLabel>
                      <FormControl>
                        <Input placeholder="2025-2026" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="HOCKY"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Học kỳ*</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">Hè</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="KHOAHOC"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Khóa*</FormLabel>
                      <FormControl>
                        <Input placeholder="K13" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="HEDAOTAO"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hệ ĐT*</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Cử nhân">Cử nhân</SelectItem>
                          <SelectItem value="Kỹ sư">Kỹ sư</SelectItem>
                          <SelectItem value="Thạc sỹ">Thạc sỹ</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="NGAY_BATDAU"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày bắt đầu*</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                      {templateId && !isEditMode && (
                        <p className="text-xs text-amber-600">Ngày các mục sẽ tự tính.</p>
                      )}
                    </FormItem>
                  )}
                />
                
                <FormField
                  name="NGAY_KETHUC"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày kết thúc*</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          onFocus={() => setIsManuallyEditingEndDate(true)} // Tạm dừng auto-update
                          onBlur={(e) => {
                            field.onBlur(e);
                            setIsManuallyEditingEndDate(false);
                            form.trigger('NGAY_KETHUC');
                          }}
                        />
                      </FormControl>
                      <FormDescription>Tự động cập nhật. Có thể sửa thủ công.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>
            </CardContent>
          </Card>
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Mốc thời gian ({fields.length})</CardTitle>
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
                      MOTA: ''
                    })
                  }
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Thêm mục
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh_-_22rem)] pr-4 -mr-4">
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
                          <div key={field.arrayId} className="group relative">
                            <SortableItemWrapper id={field.id}>
                              <MilestoneItem
                                index={index}
                                field={field}
                                remove={remove}
                                form={form}
                                onDateBlur={handleMilestoneDateBlur}
                              />
                            </SortableItemWrapper>
                            <div className="w-full h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 rounded-full bg-muted text-muted-foreground"
                                onClick={() =>
                                  insert(index + 1, {
                                    id: crypto.randomUUID(),
                                    arrayId: crypto.randomUUID(),
                                    TEN_SUKIEN: '',
                                    NGAY_BATDAU: '',
                                    NGAY_KETTHUC: '',
                                    MOTA: ''
                                  })
                                }
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
  )
}