import axiosClient from './axiosConfig';

export const getUnreadNotifications = async () => {
    const response = await axiosClient.get('/notifications');
    return response.data;
};

export const getUnreadCount = async () => {
    const response = await axiosClient.get('/notifications/unread-count');
    return response.data;
};

export const markAllAsRead = async () => {
    const response = await axiosClient.post('/notifications/mark-as-read');
    return response.data;
};