import axiosClient from './axiosConfig';

/**
 * Lấy danh sách nhóm với các tham số lọc và phân trang.
 * @param {object} params - Các tham số truy vấn (search, page, per_page, ...).
 * @returns {Promise<object>} Dữ liệu phân trang của các nhóm.
 */
export const getGroups = (params) => {
    return axiosClient.get('/admin/groups', { params }).then(res => res.data);
};

/**
 * Lấy dữ liệu thống kê về các nhóm trong một kế hoạch.
 * @param {number} planId - ID của kế hoạch.
 * @returns {Promise<object>} Đối tượng chứa dữ liệu thống kê.
 */
export const getGroupStatistics = (planId) => {
    return axiosClient.get('/admin/groups/statistics', { params: { plan_id: planId } }).then(res => res.data);
};

/**
 * Lấy danh sách sinh viên chưa hoạt động trong một kế hoạch.
 * @param {number} planId - ID của kế hoạch.
 * @returns {Promise<Array>} Danh sách sinh viên.
 */
export const getInactiveStudents = (planId) => {
    return axiosClient.get('/admin/groups/inactive-students', { params: { plan_id: planId } }).then(res => res.data);
};

/**
 * Vô hiệu hóa (xóa mềm) nhiều sinh viên.
 * @param {Array<number>} studentIds - Mảng chứa ID của các sinh viên.
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const removeStudents = (studentIds) => {
    return axiosClient.post('/admin/groups/remove-students', { studentIds }).then(res => res.data);
};

/**
 * Cập nhật thông tin của một nhóm.
 * @param {number} groupId - ID của nhóm cần cập nhật.
 * @param {object} groupData - Dữ liệu mới của nhóm.
 * @returns {Promise<object>} Dữ liệu nhóm sau khi cập nhật.
 */
export const updateGroup = (groupId, groupData) => {
    return axiosClient.put(`/admin/groups/${groupId}`, groupData).then(res => res.data);
};

/**
 * Xóa một nhóm.
 * @param {number} groupId - ID của nhóm cần xóa.
 * @returns {Promise}
 */
export const deleteGroup = (groupId) => {
    return axiosClient.delete(`/admin/groups/${groupId}`);
};

/**
 * Thực hiện chức năng tự động ghép nhóm.
 * @param {object} payload - Dữ liệu yêu cầu (plan_id, desiredMembers, priority).
 * @returns {Promise<object>} Kết quả của quá trình ghép nhóm.
 */
export const autoGroupStudents = (payload) => {
    return axiosClient.post('/admin/groups/auto-group', payload).then(res => res.data);
};

/**
 * Đánh dấu hoặc gỡ đánh dấu một nhóm là "nhóm đặc biệt".
 * @param {number} groupId - ID của nhóm.
 * @param {boolean} is_special - Trạng thái đặc biệt (true/false).
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const markGroupAsSpecial = (groupId, is_special) => {
    return axiosClient.post(`/admin/groups/${groupId}/mark-special`, { is_special }).then(res => res.data);
};

/**
 * Thêm nhiều thành viên vào một nhóm cụ thể.
 * @param {object} payload - Dữ liệu yêu cầu (ID_NHOM, student_ids).
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const addMembersToGroup = (payload) => {
    return axiosClient.post('/admin/groups/add-members', payload).then(res => res.data);
};

/**
 * Xuất danh sách nhóm của một kế hoạch ra file Excel.
 * @param {number} planId - ID của kế hoạch.
 * @returns {Promise<Blob>} Dữ liệu file blob.
 */
export const exportGroups = async (planId) => {
    const response = await axiosClient.get('/admin/groups/export', {
        responseType: 'blob',
        params: { plan_id: planId }
    });
    return response.data;
};

/**
 * Tìm kiếm sinh viên chưa có nhóm trong một kế hoạch.
 * @param {number} planId - ID của kế hoạch.
 * @param {string} search - Từ khóa tìm kiếm.
 * @returns {Promise<Array>} Danh sách sinh viên tìm thấy.
 */
export const searchUngroupedStudents = (planId, search) => {
    return axiosClient.get('/admin/groups/search-ungrouped-students', { params: { plan_id: planId, search } }).then(res => res.data);
};

/**
 * Lấy toàn bộ danh sách sinh viên chưa có nhóm trong kế hoạch.
 * @param {number} planId - ID của kế hoạch.
 * @returns {Promise<Array>} Danh sách sinh viên.
 */
export const getUngroupedStudents = (planId) => {
    return axiosClient.get('/admin/groups/ungrouped-students', { params: { plan_id: planId } }).then(res => res.data);
};

/**
 * Tạo một nhóm mới và thêm thành viên ngay lập tức.
 * @param {object} payload - Dữ liệu để tạo nhóm (plan_id, TEN_NHOM, member_ids, ...).
 * @returns {Promise<object>} Dữ liệu nhóm vừa tạo.
 */
export const createGroupWithMembers = (payload) => {
    return axiosClient.post('/admin/groups/create-with-members', payload).then(res => res.data);
};

/**
 * Xóa một thành viên ra khỏi nhóm.
 * @param {number} groupId - ID của nhóm.
 * @param {number} userId - ID của thành viên cần xóa.
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const removeGroupMember = (groupId, userId) => {
    return axiosClient.post(`/admin/groups/${groupId}/remove-member/${userId}`).then(res => res.data);
};