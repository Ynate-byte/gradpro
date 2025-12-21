import axiosClient from './axiosConfig';

export const getPlanReport = (planId) => {
    return axiosClient.get('/admin/reports/plan-report', { params: { plan_id: planId } }).then(res => res.data);
};

export const nudgeUser = (userId, type, message) => {
    return axiosClient.post('/admin/reports/nudge', { user_id: userId, type, message }).then(res => res.data);
};

export const nudgeBulk = (userIds, message) => {
    return axiosClient.post('/admin/reports/nudge-bulk', { user_ids: userIds, message }).then(res => res.data);
};

export const getStudentResults = (planId, params) => {
    return axiosClient.get('/admin/reports/student-results', { 
        params: { plan_id: planId, ...params } 
    }).then(res => res.data);
};

export const exportReportExcel = (planId) => {
    return axiosClient.get('/admin/reports/export-results', { 
        params: { plan_id: planId },
        responseType: 'blob'
    });
};