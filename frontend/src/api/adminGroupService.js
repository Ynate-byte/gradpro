import axiosClient from './axiosConfig';

export const getGroups = (params) => {
    // plan_id sẽ được truyền trong object params
    return axiosClient.get('/admin/groups', { params }).then(res => res.data);
};

export const getGroupStatistics = (planId) => {
    return axiosClient.get('/admin/groups/statistics', { params: { plan_id: planId } }).then(res => res.data);
};

export const getInactiveStudents = (planId) => {
    return axiosClient.get('/admin/groups/inactive-students', { params: { plan_id: planId } }).then(res => res.data);
};

export const removeStudents = (studentIds) => {
    return axiosClient.post('/admin/groups/remove-students', { studentIds }).then(res => res.data);
};

export const updateGroup = (groupId, groupData) => {
    return axiosClient.put(`/admin/groups/${groupId}`, groupData).then(res => res.data);
};

export const deleteGroup = (groupId) => {
    return axiosClient.delete(`/admin/groups/${groupId}`);
};

export const autoGroupStudents = (payload) => {
    // payload bây giờ sẽ chứa { plan_id, desiredMembers, priority }
    return axiosClient.post('/admin/groups/auto-group', payload).then(res => res.data);
};

export const markGroupAsSpecial = (groupId, is_special) => {
    return axiosClient.post(`/admin/groups/${groupId}/mark-special`, { is_special }).then(res => res.data);
};

export const addStudentToGroup = (payload) => {
    return axiosClient.post('/admin/groups/add-student', payload).then(res => res.data);
};

export const exportGroups = async (planId) => {
    const response = await axiosClient.get('/admin/groups/export', {
        responseType: 'blob',
        params: { plan_id: planId }
    });
    return response.data;
};