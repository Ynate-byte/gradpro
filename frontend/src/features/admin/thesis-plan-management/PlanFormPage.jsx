import React, { useState, useEffect, useCallback, useId } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format, parseISO, addDays, getDay, startOfDay, isValid } from 'date-fns'
import { vi } from 'date-fns/locale'
import { createThesisPlan, updateThesisPlan, getThesisPlanById, previewNewPlan, getThesisPlanTemplateDetails } from '../../../api/thesisPlanService'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, PlusCircle, Trash2, Eye, ChevronLeft, GripVertical } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Skeleton } from '@/components/ui/skeleton'

// Schema xác thực dữ liệu
const planSchema = z.object({
  TEN_DOT: z.string().min(5, "Tên đợt phải có ít nhất 5 ký tự."),
  NAMHOC: z.string().min(1, "Năm học không được trống."),
  HOCKY: z.string().min(1, "Học kỳ không được trống."),
  KHOAHOC: z.string().min(1, "Khóa học không được trống."),
  HEDAOTAO: z.string().min(1, "Hệ đào tạo không được trống."),
  NGAY_BATDAU: z.string().min(1, "Ngày bắt đầu không được trống."),
  NGAY_KETHUC: z.string().min(1, "Ngày kết thúc không được trống."),
  mocThoigians: z
    .array(
      z
        .object({
          id: z.any().optional().nullable(),
          TEN_SUKIEN: z.string().min(1, "Tên sự kiện không được trống."),
          NGAY_BATDAU: z.string().min(1, "Ngày bắt đầu không được trống.").refine(val => val, { message: "Ngày bắt đầu không được trống." }),
          NGAY_KETTHUC: z.string().min(1, "Ngày kết thúc không được trống.").refine(val => val, { message: "Ngày kết thúc không được trống." }),
          MOTA: z.string().optional().nullable()
        })
        .refine(
          data => !data.NGAY_BATDAU || !data.NGAY_KETTHUC || data.NGAY_KETTHUC >= data.NGAY_BATDAU,
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
    message: "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.",
    path: ["NGAY_KETHUC"]
  }
)

// Thành phần hiển thị mục mốc thời gian với khả năng kéo thả
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
                <Input type="datetime-local" {...fld} onBlur={onDateBlur} />
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
                <Input type="datetime-local" {...fld} onBlur={onDateBlur} />
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

// Bao bọc mục mốc thời gian để hỗ trợ kéo thả
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

// Điều chỉnh ngày tránh cuối tuần
function adjustDateForWeekend(date) {
  const dayOfWeek = getDay(date)
  if (dayOfWeek === 6) return addDays(date, 2) // Thứ Bảy -> Thứ Hai
  if (dayOfWeek === 0) return addDays(date, 1) // Chủ Nhật -> Thứ Hai
  return date
}

// Trang biểu mẫu kế hoạch
export default function PlanFormPage() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const templateId = location.state?.templateId
  const isEditMode = !!planId
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [templateData, setTemplateData] = useState(null)
  const [userModifiedEndDate, setUserModifiedEndDate] = useState(false)
  const [userModifiedMilestoneDates, setUserModifiedMilestoneDates] = useState({})

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
    name: "mocThoigians"
  })

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  // Xử lý thay đổi ngày bắt đầu và tự động tính toán ngày kết thúc
  const handleStartDateChange = useCallback(
    (selectedDateStr) => {
      if (!selectedDateStr || !templateData || isEditMode) return
      try {
        let planStartDate = startOfDay(parseISO(selectedDateStr))
        planStartDate = adjustDateForWeekend(planStartDate)
        const adjustedStartDateStr = format(planStartDate, 'yyyy-MM-dd')
        if (selectedDateStr !== adjustedStartDateStr) {
          form.setValue('NGAY_BATDAU', adjustedStartDateStr, { shouldValidate: true })
        }
        if (!userModifiedEndDate) {
          const planDurationWeeks = templateData.SO_TUAN_MACDINH || 12
          let planEndDate = addDays(planStartDate, planDurationWeeks * 7 - 1)
          planEndDate = adjustDateForWeekend(planEndDate)
          form.setValue('NGAY_KETHUC', format(planEndDate, 'yyyy-MM-dd'), { shouldValidate: true })
        }
        (templateData.mau_moc_thoigians || []).forEach((milestone, index) => {
          if (!userModifiedMilestoneDates[index]) {
            const { OFFSET_BATDAU, THOI_LUONG } = milestone
            let eventStartDate = addDays(planStartDate, OFFSET_BATDAU)
            eventStartDate = adjustDateForWeekend(eventStartDate)
            let eventEndDate = addDays(eventStartDate, THOI_LUONG - 1)
            eventEndDate = adjustDateForWeekend(eventEndDate)
            const dateFormat = "yyyy-MM-dd'T'HH:mm"
            form.setValue(`mocThoigians.${index}.NGAY_BATDAU`, format(eventStartDate, dateFormat), {
              shouldValidate: true
            })
            form.setValue(`mocThoigians.${index}.NGAY_KETTHUC`, format(eventEndDate, dateFormat), {
              shouldValidate: true
            })
          }
        })
      } catch (e) {
        console.error("Error calculating dates:", e)
      }
    },
    [templateData, isEditMode, form, userModifiedEndDate, userModifiedMilestoneDates]
  )

  // Tải dữ liệu kế hoạch hoặc bản mẫu
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setUserModifiedEndDate(false)
      setUserModifiedMilestoneDates({})
      try {
        let dataToLoad
        let fetchedMocThoigians = []
        if (isEditMode) {
          dataToLoad = await getThesisPlanById(planId)
          fetchedMocThoigians = dataToLoad.moc_thoigians || []
          setUserModifiedEndDate(true)
          fetchedMocThoigians.forEach((_, index) => {
            setUserModifiedMilestoneDates(prev => ({ ...prev, [index]: true }))
          })
        } else if (templateId) {
          const template = await getThesisPlanTemplateDetails(templateId)
          setTemplateData(template)
          fetchedMocThoigians = (template.mau_moc_thoigians || []).map(m => ({
            id: crypto.randomUUID(),
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
          setIsLoading(false)
          return
        }
        form.reset({
          ...(dataToLoad || {}),
          NGAY_BATDAU: dataToLoad?.NGAY_BATDAU ? format(parseISO(dataToLoad.NGAY_BATDAU), 'yyyy-MM-dd') : '',
          NGAY_KETHUC: dataToLoad?.NGAY_KETHUC ? format(parseISO(dataToLoad.NGAY_KETHUC), 'yyyy-MM-dd') : '',
          mocThoigians: fetchedMocThoigians.map(m => ({
            ...m,
            id: isEditMode ? m.ID : m.id,
            NGAY_BATDAU: m.NGAY_BATDAU && isValid(parseISO(m.NGAY_BATDAU)) ? format(parseISO(m.NGAY_BATDAU), "yyyy-MM-dd'T'HH:mm") : '',
            NGAY_KETTHUC: m.NGAY_KETTHUC && isValid(parseISO(m.NGAY_KETTHUC)) ? format(parseISO(m.NGAY_KETTHUC), "yyyy-MM-dd'T'HH:mm") : ''
          }))
        })
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

  // Theo dõi thay đổi ngày bắt đầu
  const watchedStartDate = form.watch('NGAY_BATDAU')
  useEffect(() => {
    handleStartDateChange(watchedStartDate)
  }, [watchedStartDate, handleStartDateChange])

  // Xử lý kéo thả mốc thời gian
  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      const oldIndex = fields.findIndex(item => item.id === active.id)
      const newIndex = fields.findIndex(item => item.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        const newModifiedDates = {}
        const movedFields = arrayMove(fields, oldIndex, newIndex)
        movedFields.forEach((field, idx) => {
          const originalIndex = fields.findIndex(f => f.id === field.id)
          if (userModifiedMilestoneDates[originalIndex]) {
            newModifiedDates[idx] = true
          }
        })
        setUserModifiedMilestoneDates(newModifiedDates)
        move(oldIndex, newIndex)
      }
    }
  }

  // Gửi biểu mẫu
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

  // Xem trước kế hoạch
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

  // Hiển thị skeleton khi đang tải
  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-8">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-64" />
      </div>
    )
  }

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
                          onBlur={() => setUserModifiedEndDate(true)}
                        />
                      </FormControl>
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
                          <div key={field.id} className="group relative">
                            <SortableItemWrapper id={field.id}>
                              <MilestoneItem
                                index={index}
                                field={field}
                                remove={remove}
                                form={form}
                                onDateBlur={() =>
                                  setUserModifiedMilestoneDates(prev => ({
                                    ...prev,
                                    [index]: true
                                  }))
                                }
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