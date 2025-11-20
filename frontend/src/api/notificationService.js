import axiosClient from './axiosConfig';

/**
 * Lấy danh sách thông báo.
 * @param {object} params - { page, per_page, filter: 'unread' | null }
 */
export const getNotifications = async (params) => {
    const response = await axiosClient.get('/notifications', { params });
    return response.data;
};

/**
 * Lấy số lượng chưa đọc.
 */
export const getUnreadCount = async () => {
    const response = await axiosClient.get('/notifications/unread-count');
    return response.data;
};

/**
 * Đánh dấu đã đọc.
 * @param {number|null} id - ID thông báo (null = đánh dấu tất cả)
 */
export const markAsRead = async (id = null) => {
    const payload = id ? { id } : {};
    const response = await axiosClient.post('/notifications/mark-as-read', payload);
    return response.data;
};

/**
 * Xóa thông báo.
 */
export const deleteNotification = async (id) => {
    const response = await axiosClient.delete(`/notifications/${id}`);
    return response.data;
};