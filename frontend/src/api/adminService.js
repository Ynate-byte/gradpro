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

export const getIncompleteQuotaDetails = () => {
    return axiosClient.get('/admin/dashboard/incomplete-quotas').then(res => res.data);
};

export const nudgeQuotaReminder = (id_khoa, id_kehoach) => {
    return axiosClient.post('/admin/quotas/nudge-department', { id_khoa, id_kehoach }).then(res => res.data);
};

export const nudgeAllQuotaReminders = () => {
    return axiosClient.post('/admin/quotas/nudge-all').then(res => res.data);
};

export const nudgeLecturerReminder = (id_user, missing_count) => {
    return axiosClient.post('/admin/quotas/nudge-lecturer', { id_user, missing_count }).then(res => res.data);
};