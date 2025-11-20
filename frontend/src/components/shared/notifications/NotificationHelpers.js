import React from 'react';
import { Bell, Users, Calendar, BookOpen, Info, CheckCircle, AlertTriangle } from 'lucide-react';

export const getNotificationStyle = (type) => {
    switch (type) {
        case 'GROUP':
            return {
                icon: Users,
                colorClass: 'bg-indigo-100 text-indigo-600',
                borderClass: 'border-l-indigo-500'
            };
        case 'TASK':
            return {
                icon: Calendar,
                colorClass: 'bg-orange-100 text-orange-600',
                borderClass: 'border-l-orange-500'
            };
        case 'ACADEMIC':
            return {
                icon: BookOpen,
                colorClass: 'bg-red-100 text-red-600',
                borderClass: 'border-l-red-500'
            };
        case 'SYSTEM':
        default:
            return {
                icon: Info,
                colorClass: 'bg-blue-100 text-blue-600',
                borderClass: 'border-l-blue-500'
            };
    }
};