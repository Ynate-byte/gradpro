import axiosConfig from './axiosConfig';

const thesisTopicService = {
    // Get all topics with optional filters
    getTopics: async (params = {}) => {
        const response = await axiosConfig.get('/detai', { params });
        return response;
    },

    // Create a new topic
    createTopic: async (topicData) => {
        const response = await axiosConfig.post('/detai', topicData);
        return response;
    },

    // Get topic by ID
    getTopicById: async (id) => {
        const response = await axiosConfig.get(`/detai/${id}`);
        return response;
    },

    // Update topic
    updateTopic: async (id, topicData) => {
        const response = await axiosConfig.put(`/detai/${id}`, topicData);
        return response;
    },

    // Delete topic
    deleteTopic: async (id) => {
        const response = await axiosConfig.delete(`/detai/${id}`);
        return response;
    },

    // Submit topic for approval
    submitForApproval: async (id) => {
        const response = await axiosConfig.post(`/detai/${id}/submit-approval`);
        return response;
    },

    // Approve or reject topic (Admin only)
    approveOrReject: async (id, data) => {
        const response = await axiosConfig.post(`/detai/${id}/approve-reject`, data);
        return response;
    },

    // Add suggestion to topic
    addSuggestion: async (id, suggestionData) => {
        const response = await axiosConfig.post(`/detai/${id}/suggestions`, suggestionData);
        return response;
    },

    // Get available topics for registration
    getAvailableTopics: async (params = {}) => {
        const response = await axiosConfig.get('/detai/available/for-registration', { params });
        return response;
    },

    // Register group for topic
    registerGroup: async (topicId) => {
        const response = await axiosConfig.post(`/detai/${topicId}/register-group`);
        return response;
    },

    // Get registered groups for lecturer
    getRegisteredGroups: async (params = {}) => {
        const response = await axiosConfig.get('/detai/registered-groups', { params });
        return response;
    },

    // Admin: Get all topics for review
    getAdminTopics: async (params = {}) => {
        const response = await axiosConfig.get('/admin/detai', { params });
        return response;
    },

    // Admin: Get pending topics
    getPendingTopics: async () => {
        const response = await axiosConfig.get('/admin/detai/pending');
        return response;
    },

    // Admin: Get topic statistics
    getTopicStatistics: async () => {
        const response = await axiosConfig.get('/admin/detai/statistics');
        return response;
    },

    // Admin: Approve or reject topic
    adminApproveOrReject: async (id, data) => {
        const response = await axiosConfig.post(`/admin/detai/${id}/approve-reject`, data);
        return response;
    },

    // Get topics where lecturer is assigned as supervisor (GVHD)
    getSupervisedTopics: async (params = {}) => {
        const response = await axiosConfig.get('/detai/supervised', { params });
        return response;
    },

    // Check if current user is a group leader
    isGroupLeader: async () => {
        const response = await axiosConfig.get('/check-group-leader');
        return response;
    },

    // Get group status (has registered topic or not)
    getGroupStatus: async () => {
        const response = await axiosConfig.get('/group-status');
        return response;
    },

    // Get the registered topic for the current user's group
    getMyRegisteredTopic: async () => {
        const response = await axiosConfig.get('/detai/my-registered-topic');
        return response;
    },

    // Get groups registered for lecturer's topics
    getGroupsForLecturer: async () => {
        const response = await axiosConfig.get('/detai/giangvien/groups');
        return response;
    },

    // Get group details by ID
    getGroupById: async (id) => {
        const response = await axiosConfig.get(`/groups/${id}`);
        return response;
    },

    // Evaluate group (for lecturers)
    evaluateGroup: async (id, evaluationData) => {
        const response = await axiosConfig.post(`/nhom/${id}/evaluate`, evaluationData);
        return response;
    },
};

export { thesisTopicService };