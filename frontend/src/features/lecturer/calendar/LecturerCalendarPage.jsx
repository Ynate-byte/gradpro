import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, useDraggable, useDroppable, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { getLecturerGroups, getLecturerSchedule, createQuickMeeting, rateMeeting, updateMeeting } from '@/api/lecturerCalendarService';
import { cancelMeeting } from '@/api/meetingService';
import { format, startOfWeek, endOfWeek, addWeeks, addDays, getHours, isSameWeek, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, ArrowRight, Users, Smile, Meh, Frown, GripVertical, Clock, MapPin, Link as LinkIcon, MoreHorizontal, Save, Trash2, Edit3, CalendarCheck2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import '@/features/student/my-group/components/meetings/Calendar.css';
import { MeetingDialog } from '@/features/student/my-group/components/meetings/MeetingDialog';
import { Separator } from '@/components/ui/separator';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const GroupCardContent = ({ group, isOverlay, count = 0 }) => (
    <div className={cn(
        "flex items-center justify-between p-3 bg-white dark:bg-gray-800 border rounded-lg shadow-sm transition-all select-none",
        isOverlay ? "shadow-xl border-blue-500 scale-105 cursor-grabbing ring-2 ring-blue-200 z-50" : "hover:border-blue-400 hover:shadow-md cursor-pointer", // Đã đổi cursor-grab thành cursor-pointer khi không kéo
        !isOverlay && count > 0 && "border-l-4 border-l-green-500"
    )}>
        <div className="flex flex-col overflow-hidden flex-1 mr-2 min-w-0">
            <div className="flex items-center justify-between">
                <span className="font-bold text-sm truncate text-gray-800 dark:text-gray-100">{group.TEN_NHOM}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">{group.kehoach?.TEN_DOT}</span>

                {count > 0 ? (
                    <div className="flex items-center gap-1 bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-green-200" title="Số buổi họp trong tuần này">
                        <CalendarCheck2 className="h-3 w-3" />
                        {count}
                    </div>
                ) : (
                    <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">Chưa có lịch</span>
                )}
            </div>
        </div>
        <GripVertical className="h-4 w-4 text-gray-400 shrink-0" />
    </div>
);

const DraggableGroupCard = ({ group, count }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false); // Thêm state cho Popover

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `group-${group.ID_NHOM}`,
        data: { type: 'GROUP', group }
    });

    // Đóng Popover nếu hành động kéo được kích hoạt
    useEffect(() => {
        if (isDragging) {
            setIsPopoverOpen(false);
        }
    }, [isDragging]);

    return (
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
                {/* Thành phần có thể kéo và kích hoạt Popover */}
                <div 
                    ref={setNodeRef} 
                    {...listeners} 
                    {...attributes} 
                    className={cn(
                        "mb-2 touch-none", 
                        isDragging ? "opacity-30" : "hover:scale-[1.01] transition-transform" // Thêm hiệu ứng hover click
                    )}
                >
                    <GroupCardContent group={group} count={count} isOverlay={isDragging} />
                </div>
            </PopoverTrigger>

            <PopoverContent className="w-64 p-4 z-50 shadow-xl" side="right" align="start">
                <h4 className="font-bold text-base leading-tight">{group.TEN_NHOM}</h4>
                <p className="text-sm text-muted-foreground font-medium mb-2">{group.kehoach?.TEN_DOT || 'Chưa rõ đợt'}</p>
                
                <Separator className="mb-2" />
                
                <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span>Sĩ số: <strong className="text-foreground">{group.SO_LUONG_SV}</strong> sinh viên</span>
                    </p>
                    <p className="flex items-center gap-2">
                        <CalendarCheck2 className="h-4 w-4 text-green-600" />
                        <span>Buổi họp tuần: <strong className="text-foreground">{count}</strong></span>
                    </p>
                    <div className="pt-2 text-xs italic mt-3 border-t pt-2">
                        <p>Kéo thẻ nhóm này vào lịch để tạo lịch họp nhanh.</p>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

const DroppableSessionCell = ({ day, session, children }) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const id = `cell-${dateStr}-${session.id}`;

    const { setNodeRef, isOver } = useDroppable({
        id,
        data: { date: dateStr, session }
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "calendar-grid-cell min-h-[150px] relative transition-colors duration-200 p-2 flex flex-col gap-2",
                isOver && "bg-blue-100/80 dark:bg-blue-900/60 ring-inset ring-2 ring-blue-500 z-0"
            )}
        >
            {children}
        </div>
    );
};

const CalendarEventItem = ({ event, onRate, onUpdate, onDelete, onEditDetail }) => {
    const { resource: meeting } = event;
    const [isOpen, setIsOpen] = useState(false);

    const [startTime, setStartTime] = useState('');
    const [location, setLocation] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    const { attributes, listeners, setNodeRef: setDraggableNodeRef, isDragging } = useDraggable({
        id: `meeting-${meeting.ID_LICHHOP}`,
        data: { type: 'MEETING', meeting }
    });

    useEffect(() => {
        if (isOpen) {
            setStartTime(format(parseISO(meeting.THOIGIAN_BATDAU), 'HH:mm'));
            setLocation(meeting.HINHTHUC_HOP === 'Trực tiếp' ? (meeting.DIADIEM || '') : (meeting.LINK_TRUCTUYEN || ''));
        }
    }, [isOpen, meeting]);

    const handleQuickSave = async () => {
        setIsSaving(true);
        try {
            const originalDateStr = meeting.THOIGIAN_BATDAU.split('T')[0];
            const [h, m] = startTime.split(':').map(Number);
            const [y, mon, d] = originalDateStr.split('-').map(Number);

            const newStartDate = new Date(y, mon - 1, d, h, m, 0);
            const newEndDate = new Date(newStartDate);
            newEndDate.setMinutes(newEndDate.getMinutes() + 45);

            const payload = {
                THOIGIAN_BATDAU: newStartDate.toISOString(),
                THOIGIAN_KETTHUC: newEndDate.toISOString(),
                ...(meeting.HINHTHUC_HOP === 'Trực tiếp' ? { DIADIEM: location } : { LINK_TRUCTUYEN: location }),
                TIEUDE_LICHHOP: meeting.TIEUDE_LICHHOP,
                HINHTHUC_HOP: meeting.HINHTHUC_HOP
            };

            await onUpdate(meeting.ID_LICHHOP, payload);
            setIsOpen(false);
        } catch (error) {
            console.error("Update failed", error);
            toast.error("Cập nhật thất bại.");
        } finally {
            setIsSaving(false);
        }
    };

    let colorClass = "event-default";
    if (meeting.DANHGIA === 'Tot') colorClass = "event-good";
    if (meeting.DANHGIA === 'BinhThuong') colorClass = "event-normal";
    if (meeting.DANHGIA === 'KhongTot') colorClass = "event-bad";

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <div 
                    ref={setDraggableNodeRef}
                    {...listeners}
                    {...attributes}
                    className={cn(
                        "calendar-event-item text-xs p-2 rounded border cursor-pointer hover:opacity-90 shadow-sm flex flex-col gap-1 relative z-10 hover:scale-[1.02] transition-transform group", 
                        colorClass,
                        isDragging && "opacity-30 cursor-grabbing"
                    )}
                >
                    <div className="flex justify-between items-center border-b border-black/10 pb-1 mb-1">
                        <div className="flex items-center gap-1 font-bold opacity-90">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(meeting.THOIGIAN_BATDAU), 'HH:mm')}
                        </div>
                        <div className="flex items-center gap-1">
                            {meeting.DANHGIA && (
                                <span className="bg-white/50 rounded-full p-0.5">
                                    {meeting.DANHGIA === 'Tot' && <Smile className="h-3 w-3 text-green-700" />}
                                    {meeting.DANHGIA === 'BinhThuong' && <Meh className="h-3 w-3 text-yellow-700" />}
                                    {meeting.DANHGIA === 'KhongTot' && <Frown className="h-3 w-3 text-red-700" />}
                                </span>
                            )}
                            <MoreHorizontal className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>
                    {/* Bổ sung min-w-0 để đảm bảo truncate hoạt động trong container hẹp */}
                    <p className="font-bold truncate text-sm min-w-0">{meeting.nhom?.TEN_NHOM}</p>
                    <p className="truncate opacity-80 text-[10px] italic min-w-0">{meeting.TIEUDE_LICHHOP}</p>
                    {/* Bổ sung min-w-0 cho container flex và text span bên trong */}
                    <div className="flex items-center gap-1 text-[10px] opacity-70 mt-1 min-w-0">
                        {meeting.HINHTHUC_HOP === 'Trực tiếp' ? <MapPin className="h-3 w-3 shrink-0" /> : <LinkIcon className="h-3 w-3 shrink-0" />}
                        <span className="truncate min-w-0">{meeting.HINHTHUC_HOP === 'Trực tiếp' ? (meeting.DIADIEM || 'Chưa rõ') : 'Online'}</span>
                    </div>
                </div>
            </PopoverTrigger>

            <PopoverContent className="w-80 p-0 z-50 shadow-xl overflow-hidden" side="right" align="start">
                <div className="p-4 bg-white dark:bg-gray-800 border-b flex justify-between items-start">
                    <div className="flex-1 pr-2">
                        <h4 className="font-bold text-base leading-tight">{meeting.TIEUDE_LICHHOP}</h4>
                        <p className="text-sm text-muted-foreground font-medium mt-1">{meeting.nhom?.TEN_NHOM}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 -mt-1 -mr-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => { setIsOpen(false); onEditDetail(meeting); }}
                        title="Chỉnh sửa nâng cao"
                    >
                        <Edit3 className="h-4 w-4" />
                    </Button>
                </div>

                <div className="p-4 space-y-5 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="space-y-3 bg-white dark:bg-gray-800 p-3 rounded-lg border shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="time"
                                        className="h-8 w-[110px] px-2 font-semibold text-sm bg-transparent border-0 p-0 focus-visible:ring-0 hover:bg-gray-100 rounded cursor-pointer"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                    <span className="text-sm text-muted-foreground font-medium">( +45p )</span>
                                </div>
                                <p className="text-xs text-muted-foreground capitalize mt-1">
                                    {format(parseISO(meeting.THOIGIAN_BATDAU), 'EEEE, dd/MM/yyyy', { locale: vi })}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                meeting.HINHTHUC_HOP === 'Trực tiếp' ? "bg-red-100 dark:bg-red-900/30" : "bg-indigo-100 dark:bg-indigo-900/30"
                            )}>
                                {meeting.HINHTHUC_HOP === 'Trực tiếp' ? <MapPin className="h-4 w-4 text-red-600" /> : <LinkIcon className="h-4 w-4 text-indigo-600" />}
                            </div>
                            <div className="flex-1">
                                <Input
                                    className="h-8 text-sm border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-b focus-visible:border-blue-500 rounded-none placeholder:text-muted-foreground/50"
                                    placeholder={meeting.HINHTHUC_HOP === 'Trực tiếp' ? "Nhập địa điểm..." : "Nhập link họp..."}
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)} // Đã sửa lỗi cú pháp tại đây
                                />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Đánh giá buổi họp</p>
                        <div className="grid grid-cols-3 gap-3">
                            <Button variant="outline" className={cn("h-10 border-green-200 hover:bg-green-50 hover:text-green-700 transition-all", meeting.DANHGIA === 'Tot' && "bg-green-100 text-green-700 border-green-500 ring-1 ring-green-500 shadow-sm")} onClick={() => onRate(meeting.ID_LICHHOP, 'Tot')}>
                                <Smile className="h-5 w-5" />
                            </Button>
                            <Button variant="outline" className={cn("h-10 border-yellow-200 hover:bg-yellow-50 hover:text-yellow-700 transition-all", meeting.DANHGIA === 'BinhThuong' && "bg-yellow-100 text-yellow-700 border-yellow-500 ring-1 ring-yellow-500 shadow-sm")} onClick={() => onRate(meeting.ID_LICHHOP, 'BinhThuong')}>
                                <Meh className="h-5 w-5" />
                            </Button>
                            <Button variant="outline" className={cn("h-10 border-red-200 hover:bg-red-50 hover:text-red-700 transition-all", meeting.DANHGIA === 'KhongTot' && "bg-red-100 text-red-700 border-red-500 ring-1 ring-red-500 shadow-sm")} onClick={() => onRate(meeting.ID_LICHHOP, 'KhongTot')}>
                                <Frown className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex gap-3 pt-1">
                        <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold h-9" onClick={handleQuickSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Lưu thay đổi
                        </Button>
                        <Button variant="destructive" className="px-3 h-9 bg-red-500 hover:bg-red-600" onClick={() => { setIsOpen(false); onDelete(meeting); }}>
                            <Trash2 className="h-4 w-4 mr-1" /> Hủy
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default function LecturerCalendarPage() {
    const queryClient = useQueryClient();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeDragItem, setActiveDragItem] = useState(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState(null);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [deletingMeeting, setDeletingMeeting] = useState(null);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
    );

    const options = useMemo(() => ({ locale: vi, weekStartsOn: 1 }), []);
    const weekRange = useMemo(() => ({
        start: format(startOfWeek(currentDate, options), 'yyyy-MM-dd'),
        end: format(endOfWeek(currentDate, options), 'yyyy-MM-dd'),
        display: `${format(startOfWeek(currentDate, options), 'dd/MM')} - ${format(endOfWeek(currentDate, options), 'dd/MM/yyyy')}`,
    }), [currentDate, options]);

    const daysOfWeek = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek(currentDate, options), i)), [currentDate, options]);

    const sessions = [
        { id: 'morning', name: 'Sáng', startHour: 7, endHour: 12, defaultTime: '07:00:00' },
        { id: 'afternoon', name: 'Chiều', startHour: 13, endHour: 18, defaultTime: '13:00:00' },
        { id: 'evening', name: 'Tối', startHour: 18, endHour: 22, defaultTime: '18:00:00' }
    ];

    const { data: groups = [] } = useQuery({
        queryKey: ['lecturerGroups'],
        queryFn: getLecturerGroups,
        staleTime: 5 * 60 * 1000
    });

    const { data: meetings = [], isLoading } = useQuery({
        queryKey: ['lecturerSchedule', weekRange.start],
        queryFn: () => getLecturerSchedule({ start_date: weekRange.start, end_date: weekRange.end }),
        keepPreviousData: true
    });

    const createMeetingMutation = useMutation({
        mutationFn: ({ groupId, startTime }) => createQuickMeeting(groupId, startTime),
        onSuccess: () => {
            toast.success("Đã lên lịch họp thành công!");
            queryClient.invalidateQueries({ queryKey: ['lecturerSchedule'] });
        },
        onError: () => toast.error("Lỗi khi tạo lịch họp.")
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateMeeting(id, data),
        onSuccess: () => {
            toast.success("Cập nhật thành công!");
            queryClient.invalidateQueries({ queryKey: ['lecturerSchedule'] });
        },
        onError: () => toast.error("Cập nhật thất bại.")
    });

    const rateMutation = useMutation({
        mutationFn: ({ id, rating }) => rateMeeting(id, rating),
        onSuccess: () => {
            toast.success("Đã cập nhật đánh giá.");
            queryClient.invalidateQueries({ queryKey: ['lecturerSchedule'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => cancelMeeting(id),
        onSuccess: () => {
            toast.success("Đã hủy lịch họp.");
            setIsDeleteAlertOpen(false);
            setDeletingMeeting(null);
            queryClient.invalidateQueries({ queryKey: ['lecturerSchedule'] });
        },
        onError: () => toast.error("Hủy thất bại.")
    });

    const handleDragStart = (event) => {
        if (event.active.data.current?.type === 'GROUP') {
            setActiveDragItem(event.active.data.current.group);
        } else if (event.active.data.current?.type === 'MEETING') {
            setActiveDragItem(event.active.data.current.meeting);
        }
    };

    const handleDragEnd = (event) => {
        setActiveDragItem(null);
        const { active, over } = event;
        if (!over) return;
        
        const { date, session } = over.data.current;

        if (active.data.current.type === 'GROUP') {
            const group = active.data.current.group;
            const [y, m, d] = date.split('-').map(Number);
            const [h, min, s] = session.defaultTime.split(':').map(Number);
            const localDate = new Date(y, m - 1, d, h , min, s);
            const startTime = localDate.toISOString();
            
            createMeetingMutation.mutate({ groupId: group.ID_NHOM, startTime });
        } 
        else if (active.data.current.type === 'MEETING') {
            const meeting = active.data.current.meeting;
            
            const [y, mon, d] = date.split('-').map(Number);
            
            const [h, m, s] = session.defaultTime.split(':').map(Number);
            
            const newStartDate = new Date(y, mon - 1, d, h, m, s);
            const newEndDate = new Date(newStartDate);
            newEndDate.setMinutes(newEndDate.getMinutes() + 45); 
            
            const payload = {
                THOIGIAN_BATDAU: newStartDate.toISOString(),
                THOIGIAN_KETTHUC: newEndDate.toISOString(),
                DIADIEM: meeting.DIADIEM,
                LINK_TRUCTUYEN: meeting.LINK_TRUCTUYEN,
                TIEUDE_LICHHOP: meeting.TIEUDE_LICHHOP,
                HINHTHUC_HOP: meeting.HINHTHUC_HOP
            };

            updateMutation.mutate({ id: meeting.ID_LICHHOP, data: payload });
        }
    };

    const handleEditDetail = (meeting) => {
        setEditingMeeting(meeting);
        setIsEditDialogOpen(true);
    };

    const handleDeleteClick = (meeting) => {
        setDeletingMeeting(meeting);
        setIsDeleteAlertOpen(true);
    };

    const getEventsForSession = (day, session) => {
        const dayStr = format(day, 'yyyy-MM-dd');
        return meetings
            .filter(m => {
                if (!m.THOIGIAN_BATDAU) return false;
                const mDate = format(parseISO(m.THOIGIAN_BATDAU), 'yyyy-MM-dd');
                const mHour = getHours(parseISO(m.THOIGIAN_BATDAU));
                return mDate === dayStr && mHour >= session.startHour && mHour < session.endHour;
            })
            .map(m => ({ resource: m }));
    };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex h-[calc(100vh-4rem)] flex-col md:flex-row overflow-hidden bg-background text-foreground">

                <div className="w-full md:w-72 bg-card border-r p-4 flex flex-col gap-4 shadow-sm z-20 shrink-0 h-1/4 md:h-full overflow-hidden">
                    <div className="flex-shrink-0">
                        <h2 className="font-bold text-lg flex items-center gap-2 text-foreground">
                            <Users className="h-5 w-5 text-primary" /> Nhóm hướng dẫn
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                        {groups.length === 0 ? (
                            <div className="text-sm text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                                Không có nhóm nào trong kế hoạch đang thực hiện.
                            </div>
                        ) : (
                            groups.map(group => {
                                const meetingCount = meetings.filter(m =>
                                    m.ID_NHOM === group.ID_NHOM &&
                                    parseISO(m.THOIGIAN_BATDAU) >= startOfWeek(currentDate, options) &&
                                    parseISO(m.THOIGIAN_BATDAU) <= endOfWeek(currentDate, options) &&
                                    m.TRANGTHAI !== 'Đã hủy'
                                ).length;

                                return (
                                    <DraggableGroupCard
                                        key={group.ID_NHOM}
                                        group={group}
                                        count={meetingCount}
                                    />
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-w-0 bg-muted/10 h-3/4 md:h-full">
                    <div className="flex items-center justify-between p-4 border-b bg-card shrink-0">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, -1))}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <span className="font-bold min-w-[140px] text-center text-sm md:text-lg capitalize">
                                {weekRange.display}
                            </span>
                            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())}>Hôm nay</Button>
                    </div>

                    <div className="flex-1 overflow-hidden relative p-2">
                        {isLoading && (
                            <div className="absolute inset-0 bg-background/50 z-50 flex items-center justify-center backdrop-blur-[1px]">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            </div>
                        )}

                        <div className="calendar-container shadow-sm border h-full w-full overflow-auto">
                            <div className="calendar-grid">
                                <div className="calendar-header bg-muted/50 text-muted-foreground">Buổi</div>
                                {daysOfWeek.map(day => {
                                    const isToday = isSameWeek(day, new Date(), options) && format(day, 'yyyyMMdd') === format(new Date(), 'yyyyMMdd');
                                    return (
                                        <div key={day.toISOString()} className={cn("calendar-header", isToday && "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400")}>
                                            <div className="uppercase text-[10px] font-bold opacity-70">{format(day, 'EEEE', { locale: vi })}</div>
                                            <div className="text-lg font-bold leading-none mt-0.5">{format(day, 'dd/MM')}</div>
                                        </div>
                                    );
                                })}

                                {sessions.map(session => (
                                    <React.Fragment key={session.id}>
                                        <div className="calendar-session-cell justify-center items-center text-sm font-bold text-muted-foreground bg-muted/20">
                                            {session.name}
                                        </div>
                                        {daysOfWeek.map(day => (
                                            <DroppableSessionCell key={`${day}-${session.id}`} day={day} session={session}>
                                                {getEventsForSession(day, session).map(event => (
                                                    <CalendarEventItem
                                                        key={event.resource.ID_LICHHOP}
                                                        event={event}
                                                        onUpdate={(id, data) => updateMutation.mutate({ id, data })}
                                                        onRate={(id, rating) => rateMutation.mutate({ id, rating })}
                                                        onDelete={handleDeleteClick}
                                                        onEditDetail={handleEditDetail}
                                                    />
                                                ))}
                                            </DroppableSessionCell>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <DragOverlay>
                    {activeDragItem && activeDragItem.ID_NHOM ? (
                        <div className="w-56 opacity-90 rotate-2 cursor-grabbing z-[100]">
                            <GroupCardContent group={activeDragItem} count={0} isOverlay />
                        </div>
                    ) : activeDragItem && activeDragItem.ID_LICHHOP ? (
                        <div className="w-40 opacity-90 rotate-2 cursor-grabbing z-[100] shadow-xl">
                            <div className={cn("calendar-event-item text-xs p-2 rounded border cursor-pointer flex flex-col gap-1 relative", 
                                activeDragItem.DANHGIA === 'Tot' ? 'event-good' : 
                                activeDragItem.DANHGIA === 'BinhThuong' ? 'event-normal' : 
                                activeDragItem.DANHGIA === 'KhongTot' ? 'event-bad' : 'event-default'
                            )}>
                                <div className="flex justify-between items-center border-b border-black/10 pb-1 mb-1">
                                    <div className="flex items-center gap-1 font-bold opacity-90">
                                        <Clock className="h-3 w-3" />
                                        {format(parseISO(activeDragItem.THOIGIAN_BATDAU), 'HH:mm')}
                                    </div>
                                </div>
                                <p className="font-bold truncate text-sm">{activeDragItem.nhom?.TEN_NHOM || activeDragItem.TEN_NHOM}</p>
                                <p className="truncate opacity-80 text-[10px] italic">{activeDragItem.TIEUDE_LICHHOP}</p>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>

                <MeetingDialog
                    isOpen={isEditDialogOpen}
                    setIsOpen={setIsEditDialogOpen}
                    nhomId={editingMeeting?.ID_NHOM}
                    meeting={editingMeeting}
                    onOpenChange={(open) => {
                        setIsEditDialogOpen(open);
                        if (!open) queryClient.invalidateQueries({ queryKey: ['lecturerSchedule'] });
                    }}
                />

                <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Hủy lịch họp?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Bạn có chắc chắn muốn hủy cuộc họp "{deletingMeeting?.TIEUDE_LICHHOP}"?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={deleteMutation.isPending}>Không</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => deleteMutation.mutate(deletingMeeting.ID_LICHHOP)}
                                className="bg-destructive hover:bg-destructive/90"
                                disabled={deleteMutation.isPending}
                            >
                                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Hủy
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </DndContext>
    );
}