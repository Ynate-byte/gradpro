import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cancelMeeting } from '@/api/meetingService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format, parseISO, isPast } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Loader2, CalendarDays, Clock, MapPin, Link, Edit2, Trash2, User } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper format ngày
const formatMeetingTime = (start, end) => {
    try {
        const startDate = parseISO(start);
        const endDate = end ? parseISO(end) : null;
        
        const time = format(startDate, 'HH:mm', { locale: vi });
        const date = format(startDate, 'E, dd/MM/yyyy', { locale: vi });
        
        let duration = '';
        if (endDate) {
            duration = ` - ${format(endDate, 'HH:mm', { locale: vi })}`;
        }
        
        return { time: `${time}${duration}`, date };
    } catch {
        return { time: 'N/A', date: 'N/A' };
    }
};

// Component con: Một mục Lịch họp
const MeetingItem = ({ meeting, onEdit, onCancel, isProcessing }) => {
    const { user } = useAuth();
    const { time, date } = formatMeetingTime(meeting.THOIGIAN_BATDAU, meeting.THOIGIAN_KETTHUC);
    
    const isCreator = user.ID_NGUOIDUNG === meeting.ID_NGUOITAO;
    const isCancelled = meeting.TRANGTHAI === 'Đã hủy';
    const isDone = meeting.TRANGTHAI === 'Đã diễn ra';
    const isUpcoming = meeting.TRANGTHAI === 'Đã lên lịch';

    const statusMap = {
        'Đã lên lịch': 'bg-blue-100 text-blue-800',
        'Đã diễn ra': 'bg-green-100 text-green-800',
        'Đã hủy': 'bg-zinc-100 text-zinc-600',
    };

    return (
        <div className={cn(
            "p-4 border rounded-lg transition-all",
            isUpcoming && "bg-card shadow-sm",
            !isUpcoming && "bg-muted/50 border-dashed opacity-70"
        )}>
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                        <Badge className={cn("text-xs", statusMap[meeting.TRANGTHAI])}>{meeting.TRANGTHAI}</Badge>
                        <p className="text-sm font-semibold text-primary">{meeting.TIEUDE_LICHHOP}</p>
                    </div>
                    
                    <div className="flex items-center text-sm text-muted-foreground gap-2">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>{date}, lúc {time}</span>
                    </div>

                    {meeting.HINHTHUC_HOP === 'Trực tiếp' ? (
                        <div className="flex items-center text-sm text-muted-foreground gap-2">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span>{meeting.DIADIEM}</span>
                        </div>
                    ) : (
                        <div className="flex items-center text-sm text-muted-foreground gap-2">
                            <Link className="h-4 w-4 shrink-0" />
                            <a href={meeting.LINK_TRUCTUYEN} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                                {meeting.LINK_TRUCTUYEN}
                            </a>
                        </div>
                    )}
                    
                    {meeting.GHICHU && (
                        <p className="text-sm italic text-muted-foreground pt-1">"{meeting.GHICHU}"</p>
                    )}
                </div>
                
                <div className="flex sm:flex-col items-end sm:items-start gap-2 sm:gap-4 shrink-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground" title="Người tạo">
                        <User className="h-3 w-3" />
                        <span>{meeting.nguoi_tao?.HODEM_VA_TEN || 'Không rõ'}</span>
                    </div>
                    {isCreator && isUpcoming && (
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-8" onClick={() => onEdit(meeting)} disabled={isProcessing}>
                                <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8" onClick={() => onCancel(meeting)} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Component chính: Danh sách
export function MeetingList({ meetings = [], onEdit, planId, nhomId }) {
    const [alertInfo, setAlertInfo] = useState({ isOpen: false, meeting: null });
    const queryClient = useQueryClient();
    
    const cancelMutation = useMutation({
        mutationFn: (lichHopId) => cancelMeeting(lichHopId),
        onSuccess: (res) => {
            toast.success(res.message);
            queryClient.invalidateQueries({ queryKey: ['meetings', nhomId] });
            queryClient.invalidateQueries({ queryKey: ['myGroupDetails', planId] });
        },
        onError: (error) => toast.error(error.response?.data?.message || 'Hủy lịch họp thất bại.'),
        onSettled: () => setAlertInfo({ isOpen: false, meeting: null }),
    });

    const handleCancel = () => {
        if (!alertInfo.meeting) return;
        cancelMutation.mutate(alertInfo.meeting.ID_LICHHOP);
    };
    
    // Tự động phân loại
    const { upcoming, pastOrCancelled } = useMemo(() => {
        const now = new Date();
        return meetings.reduce((acc, meeting) => {
            const isPastEvent = isPast(parseISO(meeting.THOIGIAN_BATDAU));
            if (meeting.TRANGTHAI === 'Đã lên lịch' && !isPastEvent) {
                acc.upcoming.push(meeting);
            } else {
                acc.pastOrCancelled.push(meeting);
            }
            return acc;
        }, { upcoming: [], pastOrCancelled: [] });
    }, [meetings]);

    if (meetings.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Chưa có lịch họp nào.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Lịch họp sắp tới */}
            {upcoming.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Sắp tới</h3>
                    {upcoming.map(meeting => (
                        <MeetingItem 
                            key={meeting.ID_LICHHOP} 
                            meeting={meeting}
                            onEdit={onEdit}
                            onCancel={() => setAlertInfo({ isOpen: true, meeting })}
                            isProcessing={cancelMutation.isPending && cancelMutation.variables === meeting.ID_LICHHOP}
                        />
                    ))}
                </div>
            )}
            
            {/* Lịch họp đã qua */}
            {pastOrCancelled.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Đã diễn ra / Đã hủy</h3>
                    {pastOrCancelled.map(meeting => (
                        <MeetingItem 
                            key={meeting.ID_LICHHOP} 
                            meeting={meeting}
                            onEdit={() => {}} // Không cho edit
                            onCancel={() => {}} // Không cho hủy
                            isProcessing={false}
                        />
                    ))}
                </div>
            )}

            {/* Dialog xác nhận Hủy */}
            <AlertDialog open={alertInfo.isOpen} onOpenChange={(isOpen) => !isOpen && setAlertInfo({ isOpen: false, meeting: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận Hủy Lịch họp?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn hủy cuộc họp: <strong>"{alertInfo.meeting?.TIEUDE_LICHHOP}"</strong>?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={cancelMutation.isPending}>Không</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancel}
                            disabled={cancelMutation.isPending}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Xác nhận Hủy
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}