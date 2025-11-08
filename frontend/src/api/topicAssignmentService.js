import axios from './axiosConfig';

const topicAssignmentService = {
    // Get statistics overview
    getStatistics: (params = {}) => {
        return axios.get('/admin/topic-assignments/statistics', { params });
    },

    // Get lecturers grouped by department
    getLecturers: (params = {}) => {
        return axios.get('/admin/topic-assignments/lecturers', { params });
    },

    // Assign topic quota to lecturer
    assignTopicQuota: (data) => {
        return axios.post('/admin/topic-assignments/assign-quota', data);
    },

    // Auto assign topic quotas based on plan
    autoAssignQuotas: (data) => {
        return axios.post('/admin/topic-assignments/auto-assign-quotas', data);
    },

    // Get all assignments
    getAssignments: (params = {}) => {
        return axios.get('/admin/topic-assignments/assignments', { params });
    },

    // Remove assignment
    removeAssignment: (assignmentId) => {
        return axios.delete(`/admin/topic-assignments/${assignmentId}`);
    },

    // Update assignment status
    updateAssignmentStatus: (assignmentId, status) => {
        return axios.put(`/admin/topic-assignments/${assignmentId}/status`, { TRANGTHAI: status });
    }
};

export default topicAssignmentService;
