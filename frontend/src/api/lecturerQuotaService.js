// SỬA LẠI FILE NÀY

import axios from './axiosConfig';

const lecturerQuotaService = {
    // Get lecturers in department with quota info
    getLecturers: (params = {}) => {
        return axios.get('/giangvien/quotas/lecturers', { params });
    },

    // Assign topic quota to lecturer
    assignLecturerQuota: (data) => {
        return axios.post('/giangvien/quotas/assign-lecturer-quota', data);
    },

    // Auto assign topic quotas to lecturers in department
    autoAssignLecturerQuotas: (data) => {
        return axios.post('/giangvien/quotas/auto-assign-lecturer-quotas', data);
    },

    // Get current lecturer's quota info
    getMyQuota: (params = {}) => {
        return axios.get('/giangvien/quotas/my-quota', { params });
    },
};

export default lecturerQuotaService;