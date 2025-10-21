import axiosClient from './axiosConfig';

/**
 * Lấy danh sách thông báo chưa đọc.
 * @returns {Promise<Array>} Mảng các đối tượng thông báo.
 */
export const getUnreadNotifications = async () => {
    const response = await axiosClient.get('/notifications');
    return response.data;
};

/**
 * Lấy số lượng thông báo chưa đọc.
 * @returns {Promise<object>} Đối tượng chứa số lượng.
 */
export const getUnreadCount = async () => {
    const response = await axiosClient.get('/notifications/unread-count');
    return response.data;
};

/**
 * Đánh dấu tất cả thông báo là đã đọc.
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const markAllAsRead = async () => {
    const response = await axiosClient.post('/notifications/mark-as-read');
    return response.data;
};
