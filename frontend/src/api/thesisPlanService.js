import axiosClient from './axiosConfig';

// QUẢN LÝ KẾ HOẠCH (ADMIN)

/**
 * Lấy danh sách kế hoạch khóa luận (có phân trang, tìm kiếm).
 * @param {object} params - Tham số truy vấn (page, per_page, search).
 * @returns {Promise<object>} Dữ liệu phân trang của các kế hoạch.
 */
export const getThesisPlans = (params) => {
    return axiosClient.get('/admin/thesis-plans', { params }).then(res => res.data);
};

/**
 * Lấy các tùy chọn (distinct values) để lọc kế hoạch.
 * @returns {Promise<object>} Đối tượng chứa các mảng { khoahoc, namhoc, hocky, hedaotao }.
 */
export const getPlanFilterOptions = () => {
    return axiosClient.get('/admin/thesis-plans/filter-options').then(res => res.data);
};

/**
 * Lấy danh sách rút gọn tất cả các kế hoạch (ID và Tên).
 * @returns {Promise<Array>} Danh sách kế hoạch.
 */
export const getAllPlans = () => {
    return axiosClient.get('/admin/thesis-plans/list-all').then(res => res.data);
};

/**
 * Lấy thông tin chi tiết của một kế hoạch theo ID.
 * @param {number} id - ID của kế hoạch.
 * @returns {Promise<object>} Dữ liệu chi tiết của kế hoạch.
 */
export const getThesisPlanById = (id) => {
    return axiosClient.get(`/admin/thesis-plans/${id}`).then(res => res.data);
};

/**
 * Tạo một kế hoạch khóa luận mới.
 * @param {object} data - Dữ liệu của kế hoạch.
 * @returns {Promise<object>} Dữ liệu kế hoạch vừa tạo.
 */
export const createThesisPlan = (data) => {
    return axiosClient.post('/admin/thesis-plans', data).then(res => res.data);
};

/**
 * Cập nhật một kế hoạch khóa luận.
 * @param {number} id - ID của kế hoạch.
 * @param {object} data - Dữ liệu cập nhật.
 * @returns {Promise<object>} Dữ liệu kế hoạch sau khi cập nhật.
 */
export const updateThesisPlan = (id, data) => {
    return axiosClient.put(`/admin/thesis-plans/${id}`, data).then(res => res.data);
};

/**
 * Xóa một kế hoạch khóa luận.
 * @param {number} id - ID của kế hoạch.
 * @returns {Promise}
 */
export const deleteThesisPlan = (id) => {
    return axiosClient.delete(`/admin/thesis-plans/${id}`);
};

/**
 * Gửi kế hoạch để phê duyệt.
 * @param {number} id - ID của kế hoạch.
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const submitForApproval = (id) => {
    return axiosClient.post(`/admin/thesis-plans/${id}/submit-approval`).then(res => res.data);
};

/**
 * Phê duyệt một kế hoạch.
 * @param {number} id - ID của kế hoạch.
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const approvePlan = (id) => {
    return axiosClient.post(`/admin/thesis-plans/${id}/approve`).then(res => res.data);
};

/**
 * Yêu cầu chỉnh sửa một kế hoạch.
 * @param {number} id - ID của kế hoạch.
 * @param {string} comment - Lý do yêu cầu chỉnh sửa.
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const requestChanges = (id, comment) => {
    return axiosClient.post(`/admin/thesis-plans/${id}/request-changes`, { comment }).then(res => res.data);
};

/**
 * Kích hoạt kế hoạch (chuyển sang 'Đang thực hiện').
 * @param {number} id - ID của kế hoạch.
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const activatePlan = (id) => {
    return axiosClient.post(`/admin/thesis-plans/${id}/activate`).then(res => res.data);
};

/**
 * Xuất tài liệu kế hoạch ra file PDF.
 * @param {number} id - ID của kế hoạch.
 * @returns {Promise<Blob>} Dữ liệu file blob.
 */
export const exportPlanDocument = (id) => {
    return axiosClient.get(`/admin/thesis-plans/${id}/export-document`, {
        responseType: 'blob',
    }).then(res => res.data);
};

/**
 * Xem trước tài liệu kế hoạch dưới dạng PDF.
 * @param {number} id - ID của kế hoạch.
 * @returns {Promise<Blob>} Dữ liệu file blob.
 */
export const previewPlanDocument = (id) => {
    return axiosClient.get(`/admin/thesis-plans/${id}/preview-document`, {
        responseType: 'blob',
    }).then(res => res.data);
};

/**
 * Xem trước kế hoạch mới (chưa lưu) dưới dạng PDF.
 * @param {object} data - Dữ liệu của kế hoạch.
 * @returns {Promise<Blob>} Dữ liệu file blob.
 */
export const previewNewPlan = (data) => {
    return axiosClient.post('/admin/thesis-plans/preview-new', data, {
        responseType: 'blob',
    }).then(res => res.data);
};

// MẪU KẾ HOẠCH (CHO NGƯỜI DÙNG THƯỜNG)
export const getThesisPlanTemplates = () => {
    return axiosClient.get('/thesis-plan-templates').then(res => res.data);
};
export const getThesisPlanTemplateDetails = (id) => {
    return axiosClient.get(`/thesis-plan-templates/${id}`).then(res => res.data);
};

// QUẢN LÝ MẪU KẾ HOẠCH (ADMIN)

export const getAdminThesisPlanTemplates = () => {
    return axiosClient.get('/admin/thesis-plan-templates').then(res => res.data);
};
export const getAdminThesisPlanTemplateById = (id) => {
    return axiosClient.get(`/admin/thesis-plan-templates/${id}`).then(res => res.data);
};
export const createAdminThesisPlanTemplate = (data) => {
    return axiosClient.post('/admin/thesis-plan-templates', data).then(res => res.data);
};
export const updateAdminThesisPlanTemplate = (id, data) => {
    return axiosClient.put(`/admin/thesis-plan-templates/${id}`, data).then(res => res.data);
};
export const deleteAdminThesisPlanTemplate = (id) => {
    return axiosClient.delete(`/admin/thesis-plan-templates/${id}`);
};


// --- QUẢN LÝ SINH VIÊN THAM GIA KẾ HOẠCH ---
export const getPlanParticipants = (planId, params) => {
    return axiosClient.get(`/admin/thesis-plans/${planId}/participants`, { params }).then(res => res.data);
};
export const searchStudentsForPlan = (planId, searchTerm) => {
    return axiosClient.get(`/admin/thesis-plans/${planId}/search-students`, { params: { search: searchTerm } }).then(res => res.data);
};
export const addParticipantsToPlan = (planId, studentIds, du_dieukien = true) => {
    return axiosClient.post(`/admin/thesis-plans/${planId}/participants`, { student_ids: studentIds, du_dieukien }).then(res => res.data);
};
export const updateParticipantEligibility = (planId, participantId, isEligible) => {
    return axiosClient.put(`/admin/thesis-plans/${planId}/participants/${participantId}`, { DU_DIEUKIEN: isEligible }).then(res => res.data);
};
export const removeParticipantFromPlan = (planId, participantId) => {
    return axiosClient.delete(`/admin/thesis-plans/${planId}/participants/${participantId}`);
};
export const bulkRemoveParticipantsFromPlan = (planId, participantIds) => {
  return axiosClient.post(`/admin/thesis-plans/${planId}/participants/bulk-remove`, { participant_ids: participantIds })
    .then(res => res.data);
};