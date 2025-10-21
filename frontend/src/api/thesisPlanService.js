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

/**
 * Lấy danh sách tên và ID các mẫu kế hoạch.
 * @returns {Promise<Array>} Danh sách các mẫu.
 */
export const getThesisPlanTemplates = () => {
    return axiosClient.get('/thesis-plan-templates').then(res => res.data);
};

/**
 * Lấy chi tiết một mẫu kế hoạch kèm các mốc thời gian.
 * @param {number} id - ID của mẫu.
 * @returns {Promise<object>} Dữ liệu chi tiết của mẫu.
 */
export const getThesisPlanTemplateDetails = (id) => {
    return axiosClient.get(`/thesis-plan-templates/${id}`).then(res => res.data);
};

// QUẢN LÝ MẪU KẾ HOẠCH (ADMIN)

/**
 * Lấy danh sách đầy đủ các mẫu kế hoạch (cho admin).
 * @returns {Promise<Array>} Danh sách mẫu.
 */
export const getAdminThesisPlanTemplates = () => {
    return axiosClient.get('/admin/thesis-plan-templates').then(res => res.data);
};

/**
 * Lấy chi tiết một mẫu kế hoạch theo ID (cho admin).
 * @param {number} id - ID của mẫu.
 * @returns {Promise<object>} Dữ liệu chi tiết của mẫu.
 */
export const getAdminThesisPlanTemplateById = (id) => {
    return axiosClient.get(`/admin/thesis-plan-templates/${id}`).then(res => res.data);
};

/**
 * Tạo một mẫu kế hoạch mới.
 * @param {object} data - Dữ liệu của mẫu.
 * @returns {Promise<object>} Dữ liệu mẫu vừa tạo.
 */
export const createAdminThesisPlanTemplate = (data) => {
    return axiosClient.post('/admin/thesis-plan-templates', data).then(res => res.data);
};

/**
 * Cập nhật một mẫu kế hoạch.
 * @param {number} id - ID của mẫu.
 * @param {object} data - Dữ liệu cập nhật.
 * @returns {Promise<object>} Dữ liệu mẫu sau khi cập nhật.
 */
export const updateAdminThesisPlanTemplate = (id, data) => {
    return axiosClient.put(`/admin/thesis-plan-templates/${id}`, data).then(res => res.data);
};

/**
 * Xóa một mẫu kế hoạch.
 * @param {number} id - ID của mẫu.
 * @returns {Promise}
 */
export const deleteAdminThesisPlanTemplate = (id) => {
    return axiosClient.delete(`/admin/thesis-plan-templates/${id}`);
};
