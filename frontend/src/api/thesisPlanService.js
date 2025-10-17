import axiosClient from './axiosConfig';

export const getThesisPlans = (params) => {
    return axiosClient.get('/admin/thesis-plans', { params }).then(res => res.data);
};

// THÊM HÀM MỚI
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