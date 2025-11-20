import axiosClient from './axiosConfig';

export const getStudentDashboardOverview = () => {
    return axiosClient.get('/student/dashboard/overview').then(res => res.data);
};

export const getStudentDashboardDetail = (planId) => {
    return axiosClient.get(`/student/dashboard/detail/${planId}`).then(res => res.data);
};