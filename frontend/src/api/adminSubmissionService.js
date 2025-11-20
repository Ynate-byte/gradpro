import axiosClient from './axiosConfig';

const getBaseUrl = () => {
    return '/admin/submissions'; 
};

export const getSubmissions = (params) => {
    return axiosClient.get(getBaseUrl(), { params }).then(res => res.data);
};

export const getSubmissionStatistics = (planId) => {
    const params = planId && planId !== 'all' ? { plan_id: planId } : {};
    return axiosClient.get(`${getBaseUrl()}/statistics`, { params }).then(res => res.data);
};

export const getSubmissionDetails = (submissionId) => {
    return axiosClient.get(`${getBaseUrl()}/${submissionId}`).then(res => res.data);
};

export const confirmSubmission = (submissionId) => {
    return axiosClient.post(`${getBaseUrl()}/${submissionId}/confirm`).then(res => res.data);
};

export const rejectSubmission = (submissionId, ly_do) => {
    return axiosClient.post(`${getBaseUrl()}/${submissionId}/reject`, { ly_do }).then(res => res.data);
};

export const getSubmissionsForPhancong = (phancongId) => {
    return axiosClient.get(`/admin/submissions/phancong/${phancongId}`).then(res => res.data);
};