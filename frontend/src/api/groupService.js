import axiosClient from './axiosConfig';

export const getMyGroup = async () => {
    const response = await axiosClient.get('/nhom/my-group');
    return response.data;
};

export const getPendingInvitations = async () => {
    const response = await axiosClient.get('/invitations');
    return response.data;
};

export const createGroup = async (groupData) => {
    const response = await axiosClient.post('/nhom', groupData);
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

export const findGroups = async (params) => {
    const response = await axiosClient.get('/nhom/find', { params });
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