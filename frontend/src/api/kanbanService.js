import axiosClient from './axiosConfig';

/**
 * Lấy toàn bộ dữ liệu (cột và công việc) cho một nhóm, có thể lọc theo tuần.
 * @param {number} nhomId - ID của nhóm.
 * @param {object} params - {start_date, end_date}
 */
export const getBoardData = (nhomId, params = {}) => {
    return axiosClient.get(`/kanban/board/${nhomId}`, { params }).then(res => res.data);
};

/**
 * Lấy thống kê công việc (cho card).
 */
export const getTaskStats = (nhomId) => {
    return axiosClient.get(`/kanban/stats/${nhomId}`).then(res => res.data);
};

/**
 * Di chuyển một công việc (thay đổi cột hoặc thứ tự).
 */
export const moveTask = (taskId, data) => {
    return axiosClient.put(`/kanban/task/${taskId}/move`, data).then(res => res.data);
};

// ===============================================
// === CÁC HÀM CRUD (GIỮ NGUYÊN) ===
// ===============================================

/**
 * [MỚI] Lấy chi tiết đầy đủ của 1 task (cho Dialog).
 */
export const getTaskDetails = (taskId) => {
    return axiosClient.get(`/kanban/task/${taskId}/details`).then(res => res.data);
};

/**
 * Tạo công việc mới.
 */
export const createTask = (nhomId, data) => {
    return axiosClient.post(`/kanban/task/nhom/${nhomId}`, data).then(res => res.data);
};

/**
 * Cập nhật công việc (tiêu đề, mô tả, trạng thái...).
 */
export const updateTask = (taskId, data) => {
    return axiosClient.put(`/kanban/task/${taskId}`, data).then(res => res.data);
};

/**
 * Xóa công việc.
 */
export const deleteTask = (taskId) => {
    return axiosClient.delete(`/kanban/task/${taskId}`);
};

/**
 * Gán người phụ trách cho công việc.
 */
export const assignTask = (taskId, userIds) => {
    return axiosClient.post(`/kanban/task/${taskId}/assign`, { user_ids: userIds }).then(res => res.data);
};

/**
 * Thêm bình luận vào công việc.
 */
export const addComment = (taskId, data) => {
    return axiosClient.post(`/kanban/task/${taskId}/comment`, data).then(res => res.data);
};

/**
 * [MỚI] Thêm mục checklist.
 */
export const addChecklistItem = (taskId, content) => {
    return axiosClient.post(`/kanban/task/${taskId}/checklist`, { NOIDUNG_MUC: content }).then(res => res.data);
};

/**
 * Cập nhật một mục trong checklist (check/uncheck).
 */
export const updateChecklistItem = (itemId, isCompleted) => {
    return axiosClient.put(`/kanban/checklist/${itemId}`, { DA_HOANTHANH: isCompleted }).then(res => res.data);
};

/**
 * [MỚI] Xóa mục checklist.
 */
export const deleteChecklistItem = (itemId) => {
    return axiosClient.delete(`/kanban/checklist/${itemId}`);
};