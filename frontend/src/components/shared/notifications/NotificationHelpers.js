import { 
    Bell, Users, Calendar, BookOpen, Info, 
    CheckCircle, AlertTriangle, Shield, FileText, 
    Clock, Megaphone 
} from 'lucide-react';

export const getNotificationStyle = (type) => {
    switch (type) {
        case 'ACADEMIC': // Học thuật (Chấm điểm, Duyệt đề tài)
            return {
                icon: BookOpen,
                bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
                textColor: 'text-emerald-600 dark:text-emerald-400',
                borderColor: 'border-l-emerald-500',
                label: 'Học tập'
            };
        case 'TASK': // Công việc, Lịch họp
            return {
                icon: Calendar,
                bgColor: 'bg-blue-100 dark:bg-blue-900/30',
                textColor: 'text-blue-600 dark:text-blue-400',
                borderColor: 'border-l-blue-500',
                label: 'Công việc'
            };
        case 'GROUP': // Nhóm (Mời, Xin vào)
            return {
                icon: Users,
                bgColor: 'bg-violet-100 dark:bg-violet-900/30',
                textColor: 'text-violet-600 dark:text-violet-400',
                borderColor: 'border-l-violet-500',
                label: 'Nhóm'
            };
        case 'SYSTEM': // Hệ thống, Tin tức
            return {
                icon: Megaphone,
                bgColor: 'bg-gray-100 dark:bg-gray-800',
                textColor: 'text-gray-600 dark:text-gray-400',
                borderColor: 'border-l-gray-500',
                label: 'Hệ thống'
            };
        default:
            return {
                icon: Info,
                bgColor: 'bg-gray-100 dark:bg-gray-800',
                textColor: 'text-gray-600 dark:text-gray-400',
                borderColor: 'border-l-gray-400',
                label: 'Thông báo'
            };
    }
};