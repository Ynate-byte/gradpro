import { 
    Bell, Users, Calendar, BookOpen, Info, 
    Megaphone, AlertTriangle, AlertCircle 
} from 'lucide-react';

export const getNotificationStyle = (type) => {
    switch (type) {
        case 'ACADEMIC':
            return { 
                icon: BookOpen, 
                color: 'text-emerald-600 dark:text-emerald-400', 
                bg: 'bg-emerald-100 dark:bg-emerald-900/30',
                borderColor: 'border-l-emerald-500'
            };
        case 'SYSTEM':
            return { 
                icon: Megaphone, 
                color: 'text-blue-600 dark:text-blue-400', 
                bg: 'bg-blue-100 dark:bg-blue-900/30',
                borderColor: 'border-l-blue-500'
            };
        case 'GROUP':
            return { 
                icon: Users, 
                color: 'text-violet-600 dark:text-violet-400', 
                bg: 'bg-violet-100 dark:bg-violet-900/30',
                borderColor: 'border-l-violet-500'
            };
        case 'TASK':
            return { 
                icon: Calendar, 
                color: 'text-orange-600 dark:text-orange-400', 
                bg: 'bg-orange-100 dark:bg-orange-900/30',
                borderColor: 'border-l-orange-500'
            };
        default:
            return { 
                icon: Info, 
                color: 'text-gray-600 dark:text-gray-400', 
                bg: 'bg-gray-100 dark:bg-gray-800',
                borderColor: 'border-l-gray-400'
            };
    }
};

export const getPriorityStyles = (priority, isUnread) => {
    if (!isUnread) {
        return "bg-background hover:bg-muted/40 border-l-transparent opacity-70 hover:opacity-100"; 
    }

    switch (priority) {
        case 'URGENT':
            return "bg-red-50 dark:bg-red-950/20 border-l-red-500 hover:bg-red-100 dark:hover:bg-red-900/30";
        case 'HIGH':
            return "bg-orange-50 dark:bg-orange-950/20 border-l-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30";
        default:
            return "bg-blue-50/40 dark:bg-blue-900/10 border-l-blue-500 hover:bg-blue-50/80";
    }
};

export const getPriorityIcon = (priority) => {
    if (priority === 'URGENT') return AlertTriangle;
    if (priority === 'HIGH') return AlertCircle;
    return null;
};