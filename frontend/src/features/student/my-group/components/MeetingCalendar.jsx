import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMeetingsForGroup } from '@/api/meetingService';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, getHours, parseISO } from 'date-fns'; // Thêm parseISO
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils'; // Import cn

// Component con để hiển thị sự kiện trên lịch
const CalendarEvent = ({ event, onSelectEvent }) => {
    const meeting = event.resource; // Dữ liệu LICHHOP
    const group = event.groupData;  // Dữ liệu NHOM & DETAI

    // ===== [THÊM MỚI] Logic trạng thái =====
    const status = meeting.TRANGTHAI; // 'Đã lên lịch', 'Đã diễn ra', 'Đã hủy'

    // Ánh xạ trạng thái sang CSS class
    const statusClasses = {
        'Đã lên lịch': 'event-scheduled', // Mặc định là màu xanh (primary)
        'Đã diễn ra': 'event-completed',  // Sẽ là màu xanh lá
        'Đã hủy': 'event-cancelled',    // Sẽ là màu xám
    };
    const statusClass = statusClasses[status] || 'event-scheduled';
    // ===== [KẾT THÚC THÊM MỚI] =====

    const title = event.title;
    const groupName = group?.TEN_NHOM || 'N/A'; 
    const topicCode = group?.phancong_detai_nhom?.detai?.MA_DETAI || 'N/A';

    const startTime = format(event.start, 'HH:mm');
    const endTime = event.end ? format(event.end, 'HH:mm') : null;
    const timeString = endTime ? `Giờ: ${startTime} - ${endTime}` : `Giờ: ${startTime}`;

    const locationString = meeting.HINHTHUC_HOP === 'Trực tiếp'
        ? `Phòng: ${meeting.DIADIEM || 'Chưa rõ'}`
        : 'Trực tuyến';

    const creatorString = `GV: ${meeting.nguoi_tao?.HODEM_VA_TEN || 'N/A'}`;

    return (
        <div
            // ===== [SỬA ĐỔI] Thêm class trạng thái vào đây =====
            className={cn("calendar-event-item", statusClass)}
            onClick={() => onSelectEvent(meeting)} 
        >
            {/* ===== [THÊM MỚI] Watermark "Đã Hủy" ===== */}
            {status === 'Đã hủy' && (
                <div className="event-watermark">
                    Đã hủy
                </div>
            )}
            {/* ===== [KẾT THÚC THÊM MỚI] ===== */}

            <p className="calendar-event-title">{title}</p>
            
            <div className="calendar-event-details">
                <p>{groupName}</p>
                <p>{topicCode}</p>
                <p>{timeString}</p>
                <p>{locationString}</p>
                <p>{creatorString}</p>
            </div>
        </div>
    );
};

export function MeetingCalendar({ meetings = [], groupInfo = {}, isLoading, onSelectEvent }) {
    
    // (Logic tạo ngày/ca học giữ nguyên)
    const daysOfWeek = useMemo(() => {
        const start = startOfWeek(new Date(), { weekStartsOn: 1 }); // 1 = Thứ 2
        return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    }, []); 

    const sessions = useMemo(() => [
        { name: 'Sáng', startHour: 7, endHour: 12 },
        { name: 'Chiều', startHour: 12, endHour: 18 },
        { name: 'Tối', startHour: 18, endHour: 23 },
    ], []);

    // ===== [SỬA ĐỔI] Gỡ bỏ filter 'Đã hủy' =====
    const events = useMemo(() => {
        return meetings
            // .filter(meet => meet.TRANGTHAI !== 'Đã hủy') // <--- GỠ BỎ DÒNG NÀY
            .map(meet => ({
                id: meet.ID_LICHHOP,
                title: meet.TIEUDE_LICHHOP,
                start: new Date(meet.THOIGIAN_BATDAU),
                end: meet.THOIGIAN_KETTHUC ? new Date(meet.THOIGIAN_KETTHUC) : null,
                resource: meet, 
                groupData: groupInfo,
            }));
    }, [meetings, groupInfo]);
    // ===== [KẾT THÚC SỬA ĐỔI] =====

    const getEventsForCell = (day, session) => {
        const dayString = format(day, 'yyyy-MM-dd');
        
        return events.filter(event => {
            if (!event.start || !event.start.toISOString()) return false; // Thêm kiểm tra an toàn
            
            const eventDayString = format(event.start, 'yyyy-MM-dd');
            if (eventDayString !== dayString) return false;

            const eventStartHour = getHours(event.start);
            return eventStartHour >= session.startHour && eventStartHour < session.endHour;
        });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="calendar-container">
            <div className="calendar-grid">
                
                {/* --- HÀNG TIÊU ĐỀ (HEADER) --- */}
                <div className="calendar-header">Ca học</div>
                {daysOfWeek.map(day => (
                    <div key={day.toISOString()} className="calendar-header">
                        <div>{format(day, 'EEEE', { locale: vi })}</div>
                        <div className="font-normal text-sm">{format(day, 'dd/MM/yyyy', { locale: vi })}</div>
                    </div>
                ))}

                {/* --- CÁC HÀNG CA HỌC --- */}
                {sessions.map(session => (
                    <React.Fragment key={session.name}>
                        {/* Cột đầu tiên (Sáng, Chiều, Tối) */}
                        <div className="calendar-session-cell">
                            {session.name}
                        </div>
                        
                        {/* 7 ô còn lại trong hàng */}
                        {daysOfWeek.map(day => {
                            const cellEvents = getEventsForCell(day, session);
                            
                            return (
                                <div key={day.toISOString()} className="calendar-grid-cell">
                                    {cellEvents.map(event => (
                                        <CalendarEvent 
                                            key={event.id}
                                            event={event}
                                            onSelectEvent={onSelectEvent}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
}