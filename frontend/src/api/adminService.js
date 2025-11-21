import axiosClient from './axiosConfig';

/**
 * Lấy dữ liệu thống kê tổng quan cho Admin Dashboard.
 * @returns {Promise<object>}
 */
export const getAdminDashboardStats = () => {
    return axiosClient.get('/admin/dashboard/stats').then(res => res.data);
};