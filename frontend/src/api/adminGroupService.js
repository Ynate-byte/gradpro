import axiosClient from './axiosConfig';

export const getGroups = (params) => {
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
    return axiosClient.post('/admin/groups/auto-group', payload).then(res => res.data);
};

export const markGroupAsSpecial = (groupId, is_special) => {
    return axiosClient.post(`/admin/groups/${groupId}/mark-special`, { is_special }).then(res => res.data);
};

// === BẮT ĐẦU THAY THẾ: Chức năng thêm nhiều thành viên ===
export const addMembersToGroup = (payload) => {
    return axiosClient.post('/admin/groups/add-members', payload).then(res => res.data);
};
// === KẾT THÚC THAY THẾ ===

export const exportGroups = async (planId) => {
    const response = await axiosClient.get('/admin/groups/export', {
        responseType: 'blob',
        params: { plan_id: planId }
    });
    return response.data;
};

export const searchUngroupedStudents = (planId, search) => {
    return axiosClient.get('/admin/groups/search-ungrouped-students', { params: { plan_id: planId, search } }).then(res => res.data);
};

export const getUngroupedStudents = (planId) => {
    return axiosClient.get('/admin/groups/ungrouped-students', { params: { plan_id: planId } }).then(res => res.data);
};

export const createGroupWithMembers = (payload) => {
    return axiosClient.post('/admin/groups/create-with-members', payload).then(res => res.data);
};

export const removeGroupMember = (groupId, userId) => {
    return axiosClient.post(`/admin/groups/${groupId}/remove-member/${userId}`).then(res => res.data);
};