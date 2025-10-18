import axiosClient from './axiosConfig';

export const getMyGroup = async () => {
    const response = await axiosClient.get('/nhom/my-group');
    return response.data;
};

// HÀM MỚI
export const getMyActivePlans = async () => {
    const response = await axiosClient.get('/student/my-active-plans');
    return response.data;
};

export const getPendingInvitations = async () => {
    const response = await axiosClient.get('/invitations');
    return response.data;
};

// SỬA ĐỔI: Thêm planId
export const createGroup = async (groupData, planId) => {
    const payload = { ...groupData, ID_KEHOACH: planId };
    const response = await axiosClient.post('/nhom', payload);
    return response.data;
};

export const inviteMember = async (groupId, invitationData) => {
    const response = await axiosClient.post(`/nhom/${groupId}/invite`, invitationData);
    return response.data;
};

export const handleInvitation = async (invitationId, action) => {
    const response = await axiosClient.post(`/invitations/${invitationId}/handle`, { action });
    return response.data;
};

// SỬA ĐỔI: Thêm planId
export const findGroups = async (params, planId) => {
    const allParams = { ...params, ID_KEHOACH: planId };
    const response = await axiosClient.get('/nhom/find', { params: allParams });
    return response.data;
};

export const requestToJoin = async (groupId, data) => {
    const response = await axiosClient.post(`/nhom/${groupId}/request-join`, data);
    return response.data;
};

export const handleJoinRequest = async (groupId, requestId, action) => {
    const response = await axiosClient.post(`/nhom/${groupId}/requests/${requestId}/handle`, { action });
    return response.data;
};

export const leaveGroup = async () => {
    const response = await axiosClient.post('/nhom/leave');
    return response.data;
};

export const searchUngroupedStudents = (planId, search) => {
    return axiosClient.get('/admin/groups/search-ungrouped-students', { params: { plan_id: planId, search } }).then(res => res.data);
};

export const createGroupWithMembers = (payload) => {
    return axiosClient.post('/admin/groups/create-with-members', payload).then(res => res.data);
};