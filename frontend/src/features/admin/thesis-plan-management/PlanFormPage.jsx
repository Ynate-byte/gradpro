import React, { useState, useEffect, useCallback, useId, useRef } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  format,
  parseISO,
  addDays,
  getDay,
  startOfDay,
  isValid,
  differenceInCalendarDays,
  isSaturday,
  isSunday,
} from 'date-fns'
import { vi } from 'date-fns/locale'
import { motion } from 'framer-motion'
import {
  createThesisPlan,
  updateThesisPlan,
  getThesisPlanById,
  previewNewPlan,
  getThesisPlanTemplateDetails,
} from '@/api/thesisPlanService'
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Loader2,
  PlusCircle,
  Trash2,
  Eye,
  ChevronLeft,
  GripVertical,
  Info,
  Link as LinkIcon,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import RichTextEditor from "@/components/ui/RichTextEditor"

// ──────────────────────────────────────────────────────────────
// FIX LAG 1: Wrapper Debounce cho Input thường
// ──────────────────────────────────────────────────────────────
const DebouncedInput = React.memo(({ value, onChange, onBlur, ...props }) => {
  const [localValue, setLocalValue] = useState(value ?? '');

  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 500); // Delay 500ms

    return () => clearTimeout(timer);
  }, [localValue, onChange, value]);

  const handleBlur = (e) => {
    if (localValue !== value) {
      onChange(localValue);
    }
    if (onBlur) {
      onBlur(e);
    }
  };

  return (
    <Input
      {...props}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
    />
  );
});

// ──────────────────────────────────────────────────────────────
// FIX LAG 2: Wrapper Debounce cho RichTextEditor
// ──────────────────────────────────────────────────────────────
const DebouncedRichTextEditor = React.memo(({ value, onChange }) => {
  const [localValue, setLocalValue] = useState(value ?? '');

  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(value ?? '');
    }
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 800); // Delay 800ms

    return () => clearTimeout(timer);
  }, [localValue, onChange, value]);

  return (
    <RichTextEditor
      value={localValue}
      onChange={setLocalValue}
      placeholder="Nhập mô tả (hỗ trợ in đậm, nghiêng...)"
    />
  );
});

const SYSTEM_FEATURES = [
  { value: 'none', label: '--- Không liên kết ---' },
  { value: 'GV_RA_DE', label: 'Giảng viên gửi duyệt đề tài' },
  { value: 'SV_TAO_NHOM', label: 'Sinh viên tạo nhóm' },
  { value: 'SV_DANGKY_DE', label: 'Sinh viên đăng ký đề tài' },
  { value: 'SV_NOP_BAI', label: 'Sinh viên nộp bài' },
  { value: 'CHAM_DIEM', label: 'Giảng viên chấm điểm (HD/PB)' },
]

function adjustDateForWeekend(date) {
  if (!isValid(date)) return date
  const day = getDay(date)
  if (day === 6) return startOfDay(addDays(date, 2))    // Thứ 7 → Thứ 2
  if (day === 0) return startOfDay(addDays(date, 1))    // CN → Thứ 2
  return date
}

const isNotWeekend = (val) => {
  if (!val) return true
  try {
    const d = parseISO(val)
    return isValid(d) ? !isSaturday(d) && !isSunday(d) : true
  } catch {
    return true
  }
}

const formatApproximateDays = (days) => {
  if (isNaN(days) || days <= 0) return ''
  const weeks = Math.floor(days / 7)
  const remain = days % 7
  if (weeks === 0) return `${days} ngày`
  if (remain === 0) return `${days} ngày (≈ ${weeks} tuần)`
  return `${days} ngày (≈ ${weeks} tuần, ${remain} ngày)`
}

const DATE_FORMAT = "yyyy-MM-dd'T'HH:mm"
const DATE_ONLY_FORMAT = 'yyyy-MM-dd'

// ──────────────────────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────────────────────
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
      z.object({
        id: z.any().optional().nullable(),
        TEN_SUKIEN: z.string().min(1, "Tên sự kiện không được trống."),
        NGAY_BATDAU: z.string().min(1, "Ngày bắt đầu không được trống.")
          .refine(isNotWeekend, "Ngày bắt đầu không được là Thứ Bảy hoặc Chủ Nhật."),
        NGAY_KETTHUC: z.string().min(1, "Ngày kết thúc không được trống.")
          .refine(isNotWeekend, "Ngày kết thúc không được là Thứ Bảy hoặc Chủ Nhật."),
        MOTA: z.string().optional().nullable(),
        VAITRO_THUCHIEN: z.string().max(255).optional().nullable(),
        FEATURE_KEY: z.string().optional().nullable(),
        duration: z.preprocess(
          (val) => Number(String(val).trim()) || 0,
          z.number().int().min(1, "Thời lượng phải ít nhất 1 ngày.")
        ),
      })
      .refine(
        (data) => !data.NGAY_BATDAU || !data.NGAY_KETTHUC || data.NGAY_KETTHUC >= data.NGAY_BATDAU,
        { message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.", path: ["NGAY_KETTHUC"] }
      )
    )
    .min(1, "Phải có ít nhất một mốc thời gian.")
})
.refine(
  (data) => !data.NGAY_BATDAU || !data.NGAY_KETHUC || data.NGAY_KETHUC >= data.NGAY_BATDAU,
  { message: "Ngày kết thúc kế hoạch phải sau hoặc bằng ngày bắt đầu.", path: ["NGAY_KETHUC"] }
)

const ROLES_OPTIONS = ["Sinh viên", "Giảng viên", "Giáo vụ", "Trưởng bộ môn", "Trưởng khoa"]

// ──────────────────────────────────────────────────────────────
// MilestoneItem
// ──────────────────────────────────────────────────────────────
const MilestoneItem = React.forwardRef(({
  index,
  field,
  remove,
  form,
  handleProps,
  onMilestoneChange,
  style,
  usedFeatureKeys = [],
  ...props
}, ref) => {
  const currentFeatureKey = form.watch(`mocThoigians.${index}.FEATURE_KEY`)

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
          render={({ field: f }) => (
            <FormItem>
              <FormLabel className="text-sm">Nội dung (Mục {index + 1})*</FormLabel>
              <FormControl>
                <DebouncedInput {...f} />
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
          render={({ field: f }) => (
            <FormItem>
              <FormLabel className="text-sm">Mô tả</FormLabel>
              <FormControl>
                <div className="rich-text-wrapper">
                    <DebouncedRichTextEditor
                        value={f.value}
                        onChange={f.onChange}
                    />
                </div>
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      <div className="col-span-6">
        <FormField
          name={`mocThoigians.${index}.VAITRO_THUCHIEN`}
          control={form.control}
          render={({ field: f }) => (
            <FormItem>
              <FormLabel className="text-sm">Vai trò thực hiện (Thông báo)</FormLabel>
              <Select onValueChange={(v) => f.onChange(v === "none" ? null : v)} value={f.value || "none"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">-- Không chọn --</SelectItem>
                  {ROLES_OPTIONS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      <div className="col-span-6">
        <FormField
          name={`mocThoigians.${index}.FEATURE_KEY`}
          control={form.control}
          render={({ field: f }) => {
            const available = SYSTEM_FEATURES.filter(item => {
              if (item.value === 'none') return true
              if (item.value === currentFeatureKey) return true
              return !usedFeatureKeys.includes(item.value)
            })

            return (
              <FormItem className="bg-blue-50/50 p-3 rounded-md border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 h-full">
                <FormLabel className="text-sm flex items-center gap-1 text-blue-700 dark:text-blue-300">
                  <LinkIcon className="h-3 w-3" /> Liên kết Chức năng (Tự động)
                </FormLabel>
                <Select onValueChange={(v) => f.onChange(v === "none" ? null : v)} value={f.value || "none"}>
                  <FormControl>
                    <SelectTrigger className="bg-white dark:bg-background">
                      <SelectValue placeholder="Chọn chức năng" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {available.map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription className="text-[10px] text-blue-500 leading-tight">
                  Tự động cập nhật thời gian cho chức năng này trong Cài đặt chung.
                </FormDescription>
                <FormMessage className="text-xs" />
              </FormItem>
            )
          }}
        />
      </div>

      <div className="col-span-5">
        <FormField
          name={`mocThoigians.${index}.NGAY_BATDAU`}
          control={form.control}
          render={({ field: f }) => (
            <FormItem>
              <FormLabel className="text-sm">Bắt đầu*</FormLabel>
              <FormControl>
                <DebouncedInput
                  type="datetime-local"
                  {...f}
                  onBlur={(e) => {
                    f.onBlur(e)
                    onMilestoneChange(index, 'start', e.target.value)
                  }}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      <div className="col-span-3">
        <FormField
          name={`mocThoigians.${index}.duration`}
          control={form.control}
          render={({ field: f }) => (
            <FormItem>
              <FormLabel className="text-sm">Thời lượng* (ngày)</FormLabel>
              <FormControl>
                <DebouncedInput
                  type="number"
                  min="1"
                  {...f}
                  onBlur={(e) => {
                    f.onBlur(e)
                    onMilestoneChange(index, 'duration', e.target.value)
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
          render={({ field: f }) => (
            <FormItem>
              <FormLabel className="text-sm">Kết thúc*</FormLabel>
              <FormControl>
                <DebouncedInput
                  type="datetime-local"
                  {...f}
                  onBlur={(e) => {
                    f.onBlur(e)
                    onMilestoneChange(index, 'end', e.target.value)
                  }}
                />
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

// ──────────────────────────────────────────────────────────────
// Sortable wrapper
// ──────────────────────────────────────────────────────────────
const SortableItemWrapper = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return React.cloneElement(React.Children.only(children), {
    ref: setNodeRef,
    style,
    ...attributes,
    handleProps: listeners,
  })
}

// ──────────────────────────────────────────────────────────────
// Skeleton
// ──────────────────────────────────────────────────────────────
const PlanFormSkeleton = () => (
  <div className="space-y-6 p-4 md:p-8 h-full overflow-hidden flex flex-col">
    <div className="flex justify-between items-center mb-8 shrink-0">
        <Skeleton className="h-8 w-24" />
        <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
        </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start flex-1">
      <div className="lg:col-span-1 space-y-5">
        <Card className="shadow-sm">
          <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
          <CardContent className="space-y-5 pt-2">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2 space-y-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-8 w-28" />
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="grid grid-cols-12 gap-x-4 gap-y-3 items-start p-4 border rounded-lg bg-background relative">
                <Skeleton className="col-span-12 h-8" />
                <Skeleton className="col-span-12 h-16" />
                <Skeleton className="col-span-12 h-8" />
                <div className="col-span-5"><Skeleton className="h-8" /></div>
                <div className="col-span-3"><Skeleton className="h-8" /></div>
                <div className="col-span-4"><Skeleton className="h-8" /></div>
                <Skeleton className="absolute top-2 right-2 h-7 w-7 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
)

// ──────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────
export default function PlanFormPage() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const templateId = location.state?.templateId
  const isEditMode = !!planId
  const isFromTemplate = !isEditMode && !!templateId

  const isProgrammaticUpdate = useRef(false)
  const scrollContainerRef = useRef(null) // [NEW] Ref cho vùng cuộn

  const [planStatus, setPlanStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(isEditMode || !!templateId)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [templateBaseWeeks, setTemplateBaseWeeks] = useState(12)

  const [milestoneMetadata, setMilestoneMetadata] = useState([])                  
  const [originalTemplateMetadata, setOriginalTemplateMetadata] = useState([])    

  const [isManuallyEditingPlanEndDate, setIsManuallyEditingPlanEndDate] = useState(false)
  
  // State Scroll
  const [isScrolled, setIsScrolled] = useState(false)
  const [approximateDaysText, setApproximateDaysText] = useState('')

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
      mocThoigians: []
    }
  })

  const watchedMilestones = form.watch('mocThoigians')
  const usedFeatureKeys = React.useMemo(() => {
    return watchedMilestones
      ? watchedMilestones.map(m => m.FEATURE_KEY).filter(k => k && k !== 'none')
      : []
  }, [watchedMilestones])

  const watchedStartDate = form.watch('NGAY_BATDAU')
  const watchedWeeks = form.watch('SO_TUAN_THUCHIEN')
  const watchedEndDate = form.watch('NGAY_KETHUC')

  const { fields, append, remove, move, insert } = useFieldArray({
    control: form.control,
    name: "mocThoigians",
    keyName: "arrayId"
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  )

  // ──────────────────────────────────────
  // [UPDATED] UseEffect lắng nghe scroll trên vùng cuộn mới
  // ──────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        setIsScrolled(scrollContainerRef.current.scrollTop > 10);
      }
    };
    
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isLoading]); // Chạy lại khi loading xong và ref đã được gắn

  // ──────────────────────────────────────
  // Đồng bộ NGAY_KETHUC kế hoạch
  // ──────────────────────────────────────
  const syncPlanEndDate = useCallback(() => {
    const milestones = form.getValues('mocThoigians')
    if (!milestones || milestones.length === 0) return

    let latest = null
    for (const m of milestones) {
      if (m.NGAY_KETTHUC) {
        try {
            const d = parseISO(m.NGAY_KETTHUC)
            if (isValid(d) && (!latest || d > latest)) latest = d
        } catch (e) {}
      }
    }

    if (latest && isValid(latest)) {
      const newEnd = format(adjustDateForWeekend(latest), DATE_ONLY_FORMAT)
      const curEnd = form.getValues('NGAY_KETHUC')
      if (newEnd !== curEnd) {
        form.setValue('NGAY_KETHUC', newEnd, { shouldValidate: true })
        const start = form.getValues('NGAY_BATDAU')
        if (start && isValid(parseISO(start))) {
          const days = differenceInCalendarDays(parseISO(newEnd), parseISO(start)) + 1
          setApproximateDaysText(formatApproximateDays(days))
        }
      }
    }
  }, [form])

  // Scale (chỉ khi tạo từ template)
  const scaleAllMilestones = useCallback((planStartStr, totalWeeks) => {
    if (!isFromTemplate || originalTemplateMetadata.length === 0) return
    if (!planStartStr || !isValid(parseISO(planStartStr))) return

    const planStart = adjustDateForWeekend(parseISO(planStartStr))
    const newTotalDays = (Number(totalWeeks) || 12) * 7
    const oldTotalDays = (templateBaseWeeks || 12) * 7
    const factor = oldTotalDays === 0 ? 1 : newTotalDays / oldTotalDays

    const newMeta = []
    let latestEnd = planStart

    originalTemplateMetadata.forEach((meta, i) => {
      const offset = Math.round((meta.offset || 0) * factor)
      let dur = Math.round((meta.duration || 1) * factor)
      if (dur < 1) dur = 1

      let start = adjustDateForWeekend(addDays(planStart, offset))
      let end = adjustDateForWeekend(addDays(start, dur - 1))

      form.setValue(`mocThoigians.${i}.NGAY_BATDAU`, format(start, DATE_FORMAT), { shouldValidate: true })
      form.setValue(`mocThoigians.${i}.NGAY_KETTHUC`, format(end, DATE_FORMAT), { shouldValidate: true })
      form.setValue(`mocThoigians.${i}.duration`, dur, { shouldValidate: true })

      newMeta[i] = { offset, duration: dur }
      if (end > latestEnd) latestEnd = end
    })

    setMilestoneMetadata(newMeta)
    syncPlanEndDate()
  }, [form, isFromTemplate, originalTemplateMetadata, templateBaseWeeks, syncPlanEndDate])

  const cascadeMilestoneChanges = useCallback((startIdx) => {
    const planStartStr = form.getValues('NGAY_BATDAU')
    if (!planStartStr || !isValid(parseISO(planStartStr))) return
    const planStart = parseISO(planStartStr)

    const currentMilestones = form.getValues('mocThoigians');
    if (!currentMilestones || currentMilestones.length === 0) return;

    const newMeta = [...milestoneMetadata];
    
    for (let i = startIdx + 1; i < currentMilestones.length; i++) {
      let newStart = planStart;
      if (i > 0) {
          const prevEndStr = form.getValues(`mocThoigians.${i - 1}.NGAY_KETTHUC`)
          if (prevEndStr && isValid(parseISO(prevEndStr))) {
              newStart = adjustDateForWeekend(addDays(parseISO(prevEndStr), 0)); 
          }
      } else {
          newStart = adjustDateForWeekend(planStart);
      }

      const dur = Number(form.getValues(`mocThoigians.${i}.duration`)) || 1;
      const newEnd = adjustDateForWeekend(addDays(newStart, dur - 1));

      form.setValue(`mocThoigians.${i}.NGAY_BATDAU`, format(newStart, DATE_FORMAT), { shouldValidate: true })
      form.setValue(`mocThoigians.${i}.NGAY_KETTHUC`, format(newEnd, DATE_FORMAT), { shouldValidate: true })
      
      const offset = differenceInCalendarDays(newStart, planStart)
      if (newMeta[i]) {
          newMeta[i].offset = offset;
          newMeta[i].duration = dur;
      } else {
          newMeta[i] = { offset, duration: dur };
      }
    }

    setMilestoneMetadata(newMeta)
    syncPlanEndDate()
  }, [form, syncPlanEndDate, milestoneMetadata])

  // ──────────────────────────────────────
  // Xử lý thay đổi mốc
  // ──────────────────────────────────────
  const handleMilestoneChange = useCallback((index, type, value) => {
    const planStartStr = form.getValues('NGAY_BATDAU')
    if (!planStartStr || !isValid(parseISO(planStartStr))) {
      toast.warning("Vui lòng chọn ngày bắt đầu kế hoạch trước.")
      return
    }
    const planStart = parseISO(planStartStr)
    const metaCopy = [...milestoneMetadata]
    const curMeta = { ...(metaCopy[index] || { offset: 0, duration: 1 }) }

    let startStr = form.getValues(`mocThoigians.${index}.NGAY_BATDAU`)
    let duration = Number(form.getValues(`mocThoigians.${index}.duration`)) || 1

    try {
      if (type === 'start') {
        let d = parseISO(value)
        if (!isValid(d)) return
        const adj = adjustDateForWeekend(d)
        if (adj.getTime() !== d.getTime()) {
          d = adj
          toast.info("Ngày bắt đầu đã được dời sang Thứ Hai.", { duration: 2000 })
        }
        const offset = differenceInCalendarDays(d, planStart)
        const end = adjustDateForWeekend(addDays(d, duration - 1))
        curMeta.offset = offset

        form.setValue(`mocThoigians.${index}.NGAY_BATDAU`, format(d, DATE_FORMAT), { shouldValidate: true })
        form.setValue(`mocThoigians.${index}.NGAY_KETTHUC`, format(end, DATE_FORMAT), { shouldValidate: true })

      } else if (type === 'duration') {
        duration = Number(value) || 1
        if (duration < 1) duration = 1
        let start = parseISO(startStr)
        if (!isValid(start)) start = planStart
        const end = adjustDateForWeekend(addDays(start, duration - 1))
        curMeta.duration = duration

        form.setValue(`mocThoigians.${index}.duration`, duration, { shouldValidate: true })
        form.setValue(`mocThoigians.${index}.NGAY_KETTHUC`, format(end, DATE_FORMAT), { shouldValidate: true })

      } else if (type === 'end') {
        let d = parseISO(value)
        if (!isValid(d)) return
        const adj = adjustDateForWeekend(d)
        if (adj.getTime() !== d.getTime()) {
          d = adj
          toast.info("Ngày kết thúc đã được dời sang Thứ Hai.", { duration: 2000 })
        }
        let start = parseISO(startStr)
        if (!isValid(start)) start = planStart
        if (d < start) d = start
        const newDur = differenceInCalendarDays(d, start) + 1
        curMeta.duration = newDur

        form.setValue(`mocThoigians.${index}.duration`, newDur, { shouldValidate: true })
        form.setValue(`mocThoigians.${index}.NGAY_KETTHUC`, format(d, DATE_FORMAT), { shouldValidate: true })
      }

      metaCopy[index] = curMeta
      setMilestoneMetadata(metaCopy)

      cascadeMilestoneChanges(index)

    } catch (e) {
      console.error(e)
    }
  }, [form, milestoneMetadata, isFromTemplate, cascadeMilestoneChanges])

  // ──────────────────────────────────────
  // Thêm / Xóa / Drag
  // ──────────────────────────────────────
  const addMilestone = (pos = -1) => {
    const currentMilestones = form.getValues('mocThoigians');
    let offset = 0
    let duration = 1
    let startStr = ''
    let endStr = ''
    const planStartStr = form.getValues('NGAY_BATDAU');

    if (planStartStr && isValid(parseISO(planStartStr))) {
      const planStart = parseISO(planStartStr);
      let prevEndDate = planStart;

      if (pos === -1) { 
         if (currentMilestones.length > 0) {
             const last = currentMilestones[currentMilestones.length - 1];
             if (last.NGAY_KETTHUC) prevEndDate = parseISO(last.NGAY_KETTHUC);
         }
      } else if (pos > 0) { 
         const prev = currentMilestones[pos - 1];
         if (prev.NGAY_KETTHUC) prevEndDate = parseISO(prev.NGAY_KETTHUC);
      }

      const newStart = adjustDateForWeekend(addDays(prevEndDate, currentMilestones.length > 0 ? 0 : 0));
      const newEnd = adjustDateForWeekend(addDays(newStart, duration - 1));
      
      startStr = format(newStart, DATE_FORMAT);
      endStr = format(newEnd, DATE_FORMAT);
      offset = differenceInCalendarDays(newStart, planStart);
    }

    const newItem = {
      TEN_SUKIEN: `Mốc thời gian mới`,
      NGAY_BATDAU: startStr,
      NGAY_KETTHUC: endStr,
      MOTA: '',
      VAITRO_THUCHIEN: null,
      FEATURE_KEY: 'none',
      duration,
    }

    const newMeta = { offset, duration }

    if (pos === -1) {
      append(newItem)
      setMilestoneMetadata(p => [...p, newMeta])
      if (isFromTemplate) setOriginalTemplateMetadata(p => [...p, newMeta])
      syncPlanEndDate(); 
    } else {
      insert(pos, newItem)
      setMilestoneMetadata(p => {
        const a = [...p]
        a.splice(pos, 0, newMeta)
        return a
      })
      if (isFromTemplate) setOriginalTemplateMetadata(p => {
        const a = [...p]
        a.splice(pos, 0, newMeta)
        return a
      })
      setTimeout(() => cascadeMilestoneChanges(pos), 0);
    }
  }

  const removeMilestone = (idx) => {
    remove(idx)
    setMilestoneMetadata(p => {
      const a = [...p]
      a.splice(idx, 1)
      return a
    })
    if (isFromTemplate) setOriginalTemplateMetadata(p => {
      const a = [...p]
      a.splice(idx, 1)
      return a
    })
    
    setTimeout(() => {
        if (idx > 0) cascadeMilestoneChanges(idx - 1);
        else syncPlanEndDate();
    }, 0);
  }

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      const oldIdx = fields.findIndex(f => f.arrayId === active.id)
      const newIdx = fields.findIndex(f => f.arrayId === over.id)
      if (oldIdx > -1 && newIdx > -1) {
        move(oldIdx, newIdx)
        setMilestoneMetadata(p => arrayMove(p, oldIdx, newIdx))
        if (isFromTemplate) setOriginalTemplateMetadata(p => arrayMove(p, oldIdx, newIdx))
        
        const startIdx = Math.min(oldIdx, newIdx) - 1;
        setTimeout(() => cascadeMilestoneChanges(startIdx >= -1 ? startIdx : -1), 0);
      }
    }
  }, [fields, move, milestoneMetadata, isFromTemplate, cascadeMilestoneChanges])

  // ──────────────────────────────────────
  // Load dữ liệu
  // ──────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setMilestoneMetadata([])
      setOriginalTemplateMetadata([])

      try {
        let data, mocs = [], meta = []

        if (isEditMode) {
          data = await getThesisPlanById(planId)
          setPlanStatus(data.TRANGTHAI)
          setTemplateBaseWeeks(data.SO_TUAN_THUCHIEN || 12)

          mocs = data.moc_thoigians || []
          const planStart = data.NGAY_BATDAU ? parseISO(data.NGAY_BATDAU) : null

          meta = mocs.map(m => {
            const s = parseISO(m.NGAY_BATDAU)
            const e = parseISO(m.NGAY_KETTHUC)
            const offset = planStart && isValid(s) ? differenceInCalendarDays(s, planStart) : 0
            const dur = isValid(s) && isValid(e) ? differenceInCalendarDays(e, s) + 1 : 1
            return { offset, duration: dur }
          })
        } else if (templateId) {
          const tmpl = await getThesisPlanTemplateDetails(templateId)
          setTemplateBaseWeeks(tmpl.SO_TUAN_MACDINH || 12)

          mocs = (tmpl.mau_moc_thoigians || []).map(m => ({
            TEN_SUKIEN: m.TEN_SUKIEN,
            MOTA: m.MOTA || '',
            NGAY_BATDAU: '',
            NGAY_KETTHUC: '',
            VAITRO_THUCHIEN: m.VAITRO_THUCHIEN_MACDINH || null,
            FEATURE_KEY: null, 
            duration: m.THOI_LUONG || 1
          }))

          meta = (tmpl.mau_moc_thoigians || []).map(m => ({
            offset: m.OFFSET_BATDAU || 0,
            duration: m.THOI_LUONG || 1
          }))
          setOriginalTemplateMetadata(meta)

          data = {
            HEDAOTAO: tmpl.HEDAOTAO_MACDINH,
            SO_TUAN_THUCHIEN: tmpl.SO_TUAN_MACDINH,
            TEN_DOT: '',
            NAMHOC: '',
            HOCKY: '',
            KHOAHOC: '',
            NGAY_BATDAU: '',
            NGAY_KETHUC: '',
            mocThoigians: mocs
          }
        } else {
          mocs = [{
            TEN_SUKIEN: 'Mốc thời gian 1',
            NGAY_BATDAU: '',
            NGAY_KETTHUC: '',
            MOTA: '',
            VAITRO_THUCHIEN: null,
            FEATURE_KEY: null,
            duration: 1
          }]
          meta = [{ offset: 0, duration: 1 }]

          data = {
            TEN_DOT: '',
            NAMHOC: '',
            HOCKY: '',
            KHOAHOC: '',
            HEDAOTAO: 'Cử nhân',
            SO_TUAN_THUCHIEN: 12,
            NGAY_BATDAU: '',
            NGAY_KETHUC: '',
            mocThoigians: mocs
          }
        }

        form.reset({
          ...data,
          NGAY_BATDAU: data.NGAY_BATDAU ? format(parseISO(data.NGAY_BATDAU), DATE_ONLY_FORMAT) : '',
          NGAY_KETHUC: data.NGAY_KETHUC ? format(parseISO(data.NGAY_KETHUC), DATE_ONLY_FORMAT) : '',
          mocThoigians: mocs.map((m, i) => ({
            ...m,
            arrayId: crypto.randomUUID(),
            id: isEditMode ? m.ID : null,
            NGAY_BATDAU: m.NGAY_BATDAU && isValid(parseISO(m.NGAY_BATDAU)) ? format(parseISO(m.NGAY_BATDAU), DATE_FORMAT) : '',
            NGAY_KETTHUC: m.NGAY_KETTHUC && isValid(parseISO(m.NGAY_KETTHUC)) ? format(parseISO(m.NGAY_KETTHUC), DATE_FORMAT) : '',
            duration: meta[i]?.duration || 1,
            FEATURE_KEY: m.FEATURE_KEY || 'none',
          }))
        })

        setMilestoneMetadata(meta)

        if (data.NGAY_BATDAU && data.NGAY_KETHUC) {
          const days = differenceInCalendarDays(parseISO(data.NGAY_KETHUC), parseISO(data.NGAY_BATDAU)) + 1
          setApproximateDaysText(formatApproximateDays(days))
        }
      } catch (err) {
        console.error(err)
        toast.error(isEditMode ? "Lỗi tải kế hoạch." : "Lỗi tải mẫu.")
        navigate('/admin/thesis-plans')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [planId, isEditMode, templateId, navigate, form, isFromTemplate])

  // ──────────────────────────────────────
  // Scale khi thay đổi ngày bắt đầu / số tuần (chỉ từ template)
  // ──────────────────────────────────────
  useEffect(() => {
    if (!isFromTemplate || isProgrammaticUpdate.current) return
    const start = form.getValues('NGAY_BATDAU')
    if (start && isValid(parseISO(start))) {
      isProgrammaticUpdate.current = true
      scaleAllMilestones(start, watchedWeeks)
      setTimeout(() => { isProgrammaticUpdate.current = false }, 0)
    }
  }, [watchedStartDate, watchedWeeks, scaleAllMilestones, isFromTemplate])

  // ──────────────────────────────────────
  // Khi người dùng sửa NGAY_KETHUC → cập nhật số tuần
  // ──────────────────────────────────────
  useEffect(() => {
    if (isProgrammaticUpdate.current || !isManuallyEditingPlanEndDate) return
    const start = form.getValues('NGAY_BATDAU')
    if (start && watchedEndDate && isValid(parseISO(start)) && isValid(parseISO(watchedEndDate))) {
      const days = differenceInCalendarDays(parseISO(watchedEndDate), parseISO(start)) + 1
      const weeks = Math.ceil(days / 7)
      if (weeks !== Number(form.getValues('SO_TUAN_THUCHIEN'))) {
        form.setValue('SO_TUAN_THUCHIEN', weeks, { shouldValidate: true })
      }
      setApproximateDaysText(formatApproximateDays(days))
    }
  }, [watchedEndDate, form, isManuallyEditingPlanEndDate])

  // ──────────────────────────────────────
  // Submit
  // ──────────────────────────────────────
  const onSubmit = async (values) => {
    setIsSubmitting(true)
    const payload = {
      ...values,
      mocThoigians: values.mocThoigians.map(m => ({
        id: typeof m.id === 'number' ? m.id : null,
        TEN_SUKIEN: m.TEN_SUKIEN,
        NGAY_BATDAU: m.NGAY_BATDAU,
        NGAY_KETTHUC: m.NGAY_KETTHUC,
        MOTA: m.MOTA,
        VAITRO_THUCHIEN: m.VAITRO_THUCHIEN || null,
        FEATURE_KEY: m.FEATURE_KEY === 'none' ? null : m.FEATURE_KEY,
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
    } catch (err) {
      toast.error(err.response?.data?.message || "Thao tác thất bại.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePreview = async () => {
    const valid = await form.trigger()
    if (!valid) {
      toast.error("Vui lòng sửa các lỗi trước khi xem trước.")
      return
    }
    setIsSubmitting(true)
    try {
      const values = form.getValues()
      const blob = await previewNewPlan({
        ...values,
        mocThoigians: values.mocThoigians.map(m => ({
          ...m,
          id: typeof m.id === 'number' ? m.id : null,
          VAITRO_THUCHIEN: m.VAITRO_THUCHIEN || null,
          FEATURE_KEY: m.FEATURE_KEY === 'none' ? null : m.FEATURE_KEY,
        }))
      })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      toast.error("Không thể tạo bản xem trước.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render
  if (isLoading) return <PlanFormSkeleton />

  const isPlanStartDateLocked = isEditMode && !['Bản nháp', 'Chờ phê duyệt', 'Yêu cầu chỉnh sửa', 'Đã phê duyệt'].includes(planStatus)

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col overflow-hidden">
        
        {/* Header Area */}
        <div className="flex-none p-4 md:px-8 pb-4 border-b bg-background z-10 shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => navigate('/admin/thesis-plans')}>
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
        </div>

        {/* Scrollable Content Area */}
        <div 
            ref={scrollContainerRef} 
            className="flex-1 overflow-y-auto p-4 md:p-8"
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Thông tin chung */}
              <motion.div
                 className={cn(
                   "lg:col-span-1 lg:sticky",
                   // [FIX] Điều chỉnh top cho sticky khi nằm trong scroll container
                   "lg:top-0", 
                   "lg:flex lg:flex-col lg:justify-center",
                   "transition-all duration-300 ease-out",
                   // Logic isScrolled sẽ làm giảm chiều cao khi cuộn
                   isScrolled
                     ? "lg:scale-95 lg:origin-top" // Ví dụ: Thu nhỏ nhẹ
                     : "" 
                 )}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <Card className="border-blue-200 dark:border-blue-800 shadow-sm">
                  <CardHeader className="pb-4 pt-4 pb-1 ">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Info className="h-5 w-5 text-primary" /> Thông tin chung
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-2">
                    
                    <FormField name="TEN_DOT" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tên đợt*</FormLabel><FormControl><DebouncedInput placeholder="VD: KLTN HK1, 2025-2026" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <div className="grid grid-cols-3 gap-4">
                      <FormField name="NAMHOC" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Năm học*</FormLabel><FormControl><DebouncedInput placeholder="2025-2026" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                      <FormField name="HOCKY" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Học kỳ*</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger></FormControl><SelectContent><SelectItem key="1" value="1">1</SelectItem><SelectItem key="2" value="2">2</SelectItem><SelectItem key="3" value="3">Hè</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                      <FormField name="KHOAHOC" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Khóa*</FormLabel><FormControl><DebouncedInput placeholder="K13" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField name="HEDAOTAO" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Hệ ĐT*</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem key="CN" value="Cử nhân">Cử nhân</SelectItem><SelectItem key="KS" value="Kỹ sư">Kỹ sư</SelectItem><SelectItem key="TS" value="Thạc sỹ">Thạc sỹ</SelectItem></SelectContent></Select><FormMessage /></FormItem> )}/>
                      <FormField name="SO_TUAN_THUCHIEN" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Số tuần TH*</FormLabel>
                          <FormControl>
                            <DebouncedInput
                              type="number" min="1" placeholder="12"
                              {...field}
                              onBlur={field.onBlur}
                              onChange={(val) => {
                                field.onChange(val); 
                                setIsManuallyEditingPlanEndDate(false); 
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                             <span className="text-sky-600 font-medium">{approximateDaysText}</span>
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}/>
                    </div>

                    {/* Dòng 4: Ngày bắt đầu - Kết thúc */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField name="NGAY_BATDAU" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ngày bắt đầu*</FormLabel>
                          <FormControl>
                            <DebouncedInput
                              type="date"
                              {...field}
                              disabled={isPlanStartDateLocked}
                              onBlur={(e) => {
                                field.onBlur(e);
                                const adjustedDate = adjustDateForWeekend(parseISO(e.target.value));
                                const adjustedDateStr = format(adjustedDate, DATE_ONLY_FORMAT);
                                
                                if (e.target.value !== adjustedDateStr) {
                                  toast.info("Ngày bắt đầu đã được dời sang Thứ Hai.", { duration: 2000 });
                                  field.onChange(adjustedDateStr); 
                                }
                                setIsManuallyEditingPlanEndDate(false);
                              }}
                            />
                          </FormControl>
                          {isPlanStartDateLocked && <FormDescription className="text-destructive text-[10px]">Đang chạy.</FormDescription>}
                          <FormMessage />
                        </FormItem>
                      )}/>
                      <FormField name="NGAY_KETHUC" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ngày kết thúc*</FormLabel>
                          <FormControl>
                            <DebouncedInput
                              type="date"
                              {...field}
                              onFocus={() => setIsManuallyEditingPlanEndDate(true)}
                              onBlur={(e) => {
                                field.onBlur(e);
                                const newEndDateStr = e.target.value;
                                const adjustedEndDate = adjustDateForWeekend(parseISO(newEndDateStr));
                                const adjustedEndDateStr = format(adjustedEndDate, DATE_ONLY_FORMAT);
                                
                                if (newEndDateStr !== adjustedEndDateStr) {
                                  toast.info("Ngày kết thúc đã được dời sang Thứ Hai.", { duration: 2000 });
                                  field.onChange(adjustedEndDateStr); 
                                }
                              }}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                      )}/>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Cột phải: Mốc thời gian */}
              <motion.div
                className="lg:col-span-2 space-y-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
              >
                <Card className="border-blue-200 dark:border-blue-800 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <CardTitle className="text-lg">Mốc thời gian ({fields.length})</CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={() => addMilestone(-1)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Thêm mục
                    </Button>
                  </CardHeader>
                   <CardContent className="pt-2">
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={fields.map(f => f.arrayId)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-4">
                            {fields.map((field, idx) => (
                              <div key={field.arrayId} className="group relative pl-7">
                                <SortableItemWrapper id={field.arrayId}>
                                  <MilestoneItem
                                    index={idx}
                                    field={field}
                                    remove={() => removeMilestone(idx)}
                                    form={form}
                                    onMilestoneChange={handleMilestoneChange}
                                    usedFeatureKeys={usedFeatureKeys}
                                  />
                                </SortableItemWrapper>
                                <div className="w-full h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                    onClick={() => addMilestone(idx + 1)}
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
        </div>
      </form>
    </Form>
  )
}