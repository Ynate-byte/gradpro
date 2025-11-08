import axios from './axiosConfig';

const departmentHeadQuotaService = {
    // Get lecturers in department with quota info
    getLecturers: (params = {}) => {
        return axios.get('/department-head/quotas/lecturers', { params });
    },

    // Assign topic quota to lecturer
    assignLecturerQuota: (data) => {
        return axios.post('/department-head/quotas/assign-lecturer-quota', data);
    },

    // Auto assign topic quotas to lecturers in department
    autoAssignLecturerQuotas: (data) => {
        return axios.post('/department-head/quotas/auto-assign-lecturer-quotas', data);
    },

    // Get current lecturer's quota info
    getMyQuota: (params = {}) => {
        return axios.get('/department-head/quotas/my-quota', { params });
    },
};

export default departmentHeadQuotaService;
