import axios from './axiosConfig';

const quotaService = {
    // Get statistics overview
    getStatistics: (params = {}) => {
        return axios.get('/admin/quotas/statistics', { params });
    },

    // Get departments with quota info
    getDepartments: (params = {}) => {
        return axios.get('/admin/quotas/departments', { params });
    },

    // Assign topic quota to department
    assignDepartmentQuota: (data) => {
        return axios.post('/admin/quotas/assign-department-quota', data);
    },

    // Auto assign topic quotas to lecturers
    autoAssignQuotas: (data) => {
        return axios.post('/admin/quotas/auto-assign-quotas', data);
    },

    // Get all quota assignments
    getAssignments: (params = {}) => {
        return axios.get('/admin/quotas/assignments', { params });
    },

    // Update assignment status
    updateAssignmentStatus: (assignmentId, data) => {
        return axios.put(`/admin/quotas/${assignmentId}/status`, data);
    },

    // Remove assignment
    removeAssignment: (assignmentId) => {
        return axios.delete(`/admin/quotas/${assignmentId}`);
    },

    updateReusePercentage: (data) => {
        return axios.post('/admin/quotas/update-reuse-percentage', data);
    },
};

export default quotaService;
