import React, { useMemo } from 'react';
// Bỏ import useQuery, getMeetingsForGroup, toast
import { Loader2 } from 'lucide-react';
import { format, startOfWeek, addDays, getHours, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Component con để hiển thị sự kiện trên lịch
const CalendarEvent = ({ event, onSelectEvent }) => {
    const meeting = event.resource; // Dữ liệu LICHHOP
    const group = event.groupData;  // Dữ liệu NHOM & DETAI

    const status = meeting.TRANGTHAI; 
    const creatorRole = meeting.nguoi_tao?.vaitro?.TEN_VAITRO; 
    
    const isLecturerCreated = ['Giảng viên', 'Trưởng khoa', 'Giáo vụ', 'Admin'].includes(creatorRole);

    let statusClass = '';
    if (status === 'Đã hủy') {
        statusClass = 'event-cancelled';
    } else if (status === 'Đã diễn ra') {
        statusClass = 'event-completed';
    } else if (isLecturerCreated) {
        statusClass = 'event-lecturer';
    } else {
        statusClass = 'event-scheduled';
    }

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
            className={cn("calendar-event-item", statusClass)}
            onClick={() => onSelectEvent(meeting)} 
        >
            {status === 'Đã hủy' && (
                <div className="event-watermark">
                    Đã hủy
                </div>
            )}

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

// ===== [SỬA LỖI] Nhận props thay vì tự fetch =====
export function MeetingCalendar({ meetings = [], groupInfo = {}, isLoading, onSelectEvent }) {
    
    // 1. BỎ HOOK useQuery
    // 2. Dữ liệu meetings và groupInfo được truyền trực tiếp từ props

    // 3. Tạo 7 ngày trong tuần
    const daysOfWeek = useMemo(() => {
        const start = startOfWeek(new Date(), { weekStartsOn: 1 }); // 1 = Thứ 2
        return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    }, []); 

    // 4. Định nghĩa các ca học
    const sessions = useMemo(() => [
        { name: 'Sáng', startHour: 7, endHour: 12 },
        { name: 'Chiều', startHour: 12, endHour: 18 },
        { name: 'Tối', startHour: 18, endHour: 23 },
    ], []);

    // 5. Chuyển đổi dữ liệu (thêm groupInfo vào event)
    const events = useMemo(() => {
        return meetings
            .filter(meet => meet.TRANGTHAI !== 'Đã hủy') // <-- Gỡ bỏ bộ lọc này
            .map(meet => ({
                id: meet.ID_LICHHOP,
                title: meet.TIEUDE_LICHHOP,
                start: new Date(meet.THOIGIAN_BATDAU),
                end: meet.THOIGIAN_KETTHUC ? new Date(meet.THOIGIAN_KETTHUC) : null,
                resource: meet, 
                groupData: groupInfo, // <-- Dùng prop groupInfo
            }));
    }, [meetings, groupInfo]); // <-- Dùng props

    /**
     * Lọc các sự kiện thuộc về một ngày và một ca cụ thể
     */
    const getEventsForCell = (day, session) => {
        const dayString = format(day, 'yyyy-MM-dd');
        
        return events.filter(event => {
            if (!event.start || !event.start.toISOString()) return false; 
            
            const eventDayString = format(event.start, 'yyyy-MM-dd');
            if (eventDayString !== dayString) return false;

            const eventStartHour = getHours(event.start);
            return eventStartHour >= session.startHour && eventStartHour < session.endHour;
        });
    };

    // 6. Sử dụng prop `isLoading`
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
                <div className="calendar-header">Lịch họp</div>
                {daysOfWeek.map(day => (
                    <div key={day.toISOString()} className="calendar-header">
                        <div>{format(day, 'EEEE', { locale: vi })}</div>
                        <div className="font-normal text-sm">{format(day, 'dd/MM/yyyy', { locale: vi })}</div>
                    </div>
                ))}

                {/* --- CÁC HÀNG CA HỌC --- */}
                {sessions.map(session => (
                    <React.Fragment key={session.name}>
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