import axiosClient from './axiosConfig';

export const getThesisPlans = (params) => {
    return axiosClient.get('/admin/thesis-plans', { params }).then(res => res.data);
};

export const getAllPlans = () => {
    return axiosClient.get('/admin/thesis-plans/list-all').then(res => res.data);
};

export const getThesisPlanById = (id) => {
    return axiosClient.get(`/admin/thesis-plans/${id}`).then(res => res.data);
};

export const createThesisPlan = (data) => {
    return axiosClient.post('/admin/thesis-plans', data).then(res => res.data);
};

export const updateThesisPlan = (id, data) => {
    return axiosClient.put(`/admin/thesis-plans/${id}`, data).then(res => res.data);
};

export const deleteThesisPlan = (id) => {
    return axiosClient.delete(`/admin/thesis-plans/${id}`);
};

export const submitForApproval = (id) => {
    return axiosClient.post(`/admin/thesis-plans/${id}/submit-approval`).then(res => res.data);
};

export const approvePlan = (id) => {
    return axiosClient.post(`/admin/thesis-plans/${id}/approve`).then(res => res.data);
};

export const requestChanges = (id, comment) => {
    return axiosClient.post(`/admin/thesis-plans/${id}/request-changes`, { comment }).then(res => res.data);
};

export const exportPlanDocument = (id) => {
    return axiosClient.get(`/admin/thesis-plans/${id}/export-document`, {
        responseType: 'blob',
    }).then(res => res.data);
};

export const previewPlanDocument = (id) => {
    return axiosClient.get(`/admin/thesis-plans/${id}/preview-document`, {
        responseType: 'blob',
    }).then(res => res.data);
};
export const previewNewPlan = (data) => {
    return axiosClient.post('/admin/thesis-plans/preview-new', data, {
        responseType: 'blob',
    }).then(res => res.data);
};

// --- User-facing Template API ---
export const getThesisPlanTemplates = () => {
    // API này lấy danh sách tên và ID mẫu (cho sinh viên/user)
    return axiosClient.get('/thesis-plan-templates').then(res => res.data);
};

export const getThesisPlanTemplateDetails = (id) => {
    // API này lấy chi tiết một mẫu kèm các mốc thời gian (cho sinh viên/user)
    return axiosClient.get(`/thesis-plan-templates/${id}`).then(res => res.data);
};

// --- Admin Template Management API ---
export const getAdminThesisPlanTemplates = () => {
    return axiosClient.get('/admin/thesis-plan-templates').then(res => res.data);
};

// *** ADDED THIS FUNCTION ***
export const getAdminThesisPlanTemplateById = (id) => {
    return axiosClient.get(`/admin/thesis-plan-templates/${id}`).then(res => res.data);
};
// **************************

export const createAdminThesisPlanTemplate = (data) => {
    return axiosClient.post('/admin/thesis-plan-templates', data).then(res => res.data);
};

export const updateAdminThesisPlanTemplate = (id, data) => {
    return axiosClient.put(`/admin/thesis-plan-templates/${id}`, data).then(res => res.data);
};

export const deleteAdminThesisPlanTemplate = (id) => {
    return axiosClient.delete(`/admin/thesis-plan-templates/${id}`);
};