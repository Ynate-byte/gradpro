import axiosClient from './axiosConfig';

/**
 * Lấy dữ liệu thống kê tổng quan cho Admin Dashboard (Workflow, Risks, Actions, Active Plans).
 */
export const getAdminDashboardStats = () => {
    return axiosClient.get('/admin/dashboard/stats').then(res => res.data);
};

/**
 * Lấy danh sách nhắc nhở & cảnh báo thông minh.
 */
export const getAdminReminders = () => {
    return axiosClient.get('/admin/dashboard/reminders').then(res => res.data);
};