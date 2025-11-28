import axiosClient from './axiosConfig';

/**
 * Lấy lịch sử hoạt động cá nhân.
 * @param {object} params - { page, per_page, type }
 */
export const getPersonalHistory = (params) => {
    return axiosClient.get('/history/personal', { params }).then(res => res.data);
};

export const getPersonalHistoryStats = () => {
    return axiosClient.get('/history/personal/stats').then(res => res.data);
};

/**
 * Lấy lịch sử hoạt động của nhóm.
 * @param {number} groupId
 * @param {object} params - { page, per_page, type }
 */
export const getGroupHistory = (groupId, params) => {
    return axiosClient.get(`/history/group/${groupId}`, { params }).then(res => res.data);
};

export const getSystemHistory = (params) => {
    return axiosClient.get('/admin/history', { params }).then(res => res.data);
};

export const cleanupLogs = (data) => {
    return axiosClient.post('/admin/history/cleanup', data).then(res => res.data);
};

/**
 * Lấy lịch sử hoạt động của một đề tài.
 * @param {number} topicId
 * @param {object} params
 */
export const getTopicHistory = (topicId, params) => {
    return axiosClient.get(`/history/topic/${topicId}`, { params }).then(res => res.data);
};