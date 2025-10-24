import axiosClient from './axiosConfig';

/**
 * Lấy thông tin nhóm hiện tại của người dùng.
 * @returns {Promise<object>} Dữ liệu nhóm hoặc trạng thái chưa có nhóm.
 */
export const getMyGroup = async () => {
    const response = await axiosClient.get('/nhom/my-group');
    return response.data;
};

/**
 * Lấy danh sách các kế hoạch đang hoạt động mà sinh viên tham gia.
 * @returns {Promise<Array>} Danh sách kế hoạch.
 */
export const getMyActivePlans = async () => {
    const response = await axiosClient.get('/student/my-active-plans');
    return response.data;
};

/**
 * Lấy danh sách lời mời vào nhóm đang chờ xử lý.
 * @returns {Promise<Array>} Danh sách lời mời.
 */
export const getPendingInvitations = async () => {
    const response = await axiosClient.get('/invitations');
    return response.data;
};

/**
 * Tạo một nhóm mới.
 * @param {object} groupData - Dữ liệu của nhóm mới.
 * @param {number} planId - ID của kế hoạch mà nhóm thuộc về.
 * @returns {Promise<object>} Dữ liệu nhóm vừa được tạo.
 */
export const createGroup = async (groupData, planId) => {
    const payload = { ...groupData, ID_KEHOACH: planId };
    const response = await axiosClient.post('/nhom', payload);
    return response.data;
};

/**
 * Mời một thành viên vào nhóm.
 * @param {number} groupId - ID của nhóm.
 * @param {object} invitationData - Dữ liệu lời mời (MA_DINHDANH, LOINHAN).
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const inviteMember = async (groupId, invitationData) => {
    const response = await axiosClient.post(`/nhom/${groupId}/invite`, invitationData);
    return response.data;
};

/**
 * Xử lý một lời mời (chấp nhận hoặc từ chối).
 * @param {number} invitationId - ID của lời mời.
 * @param {string} action - Hành động ('accept' hoặc 'decline').
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const handleInvitation = async (invitationId, action) => {
    const response = await axiosClient.post(`/invitations/${invitationId}/handle`, { action });
    return response.data;
};

/**
 * Tìm kiếm các nhóm đang mở trong một kế hoạch.
 * @param {object} params - Các tham số tìm kiếm (search, ID_CHUYENNGANH, ...).
 * @param {number} planId - ID của kế hoạch.
 * @returns {Promise<object>} Dữ liệu phân trang của các nhóm.
 */
export const findGroups = async (params, planId) => {
    const allParams = { ...params, ID_KEHOACH: planId };
    const response = await axiosClient.get('/nhom/find', { params: allParams });
    return response.data;
};

/**
 * Gửi yêu cầu xin tham gia một nhóm.
 * @param {number} groupId - ID của nhóm.
 * @param {object} data - Dữ liệu yêu cầu (ví dụ: lời nhắn).
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const requestToJoin = async (groupId, data) => {
    const response = await axiosClient.post(`/nhom/${groupId}/request-join`, data);
    return response.data;
};

/**
 * Xử lý một yêu cầu xin tham gia (chấp nhận hoặc từ chối).
 * @param {number} groupId - ID của nhóm.
 * @param {number} requestId - ID của yêu cầu.
 * @param {string} action - Hành động ('accept' hoặc 'decline').
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const handleJoinRequest = async (groupId, requestId, action) => {
    const response = await axiosClient.post(`/nhom/${groupId}/requests/${requestId}/handle`, { action });
    return response.data;
};

/**
 * Rời khỏi nhóm hiện tại.
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const leaveGroup = async () => {
    const response = await axiosClient.post('/nhom/leave');
    return response.data;
};

/**
 * Chuyển quyền trưởng nhóm cho một thành viên khác.
 * @param {number} groupId - ID của nhóm.
 * @param {number} newLeaderId - ID của trưởng nhóm mới.
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const transferGroupLeadership = (groupId, newLeaderId) => {
    return axiosClient.post(`/nhom/${groupId}/transfer-leadership/${newLeaderId}`).then(res => res.data);
};

/**
 * Hủy một yêu cầu tham gia (do sinh viên gửi).
 * @param {number} requestId - ID của yêu cầu.
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const cancelJoinRequest = async (requestId) => {
    const response = await axiosClient.post(`/requests/${requestId}/cancel`);
    return response.data;
};

/**
 * Hủy một lời mời (do nhóm trưởng gửi).
 * @param {number} groupId - ID của nhóm.
 * @param {number} invitationId - ID của lời mời.
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const cancelInvitation = async (groupId, invitationId) => {
    const response = await axiosClient.post(`/nhom/${groupId}/invitations/${invitationId}/cancel`);
    return response.data;
};