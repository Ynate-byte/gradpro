import axiosClient from './axiosConfig';

/**
 * Lấy danh sách các phiếu nộp đang chờ duyệt (có phân trang, lọc).
 * @param {object} params - Tham số (page, per_page, plan_id)
 * @returns {Promise<object>} Dữ liệu phân trang.
 */
export const getSubmissions = (params) => {
    return axiosClient.get('/admin/submissions', { params }).then(res => res.data);
};

/**
 * Lấy chi tiết một phiếu nộp.
 * @param {number} submissionId - ID của phiếu nộp.
 * @returns {Promise<object>} Dữ liệu chi tiết phiếu nộp.
 */
export const getSubmissionDetails = (submissionId) => {
    return axiosClient.get(`/admin/submissions/${submissionId}`).then(res => res.data);
};

/**
 * Xác nhận (duyệt) một phiếu nộp là "Đã xác nhận".
 * @param {number} submissionId - ID của phiếu nộp.
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const confirmSubmission = (submissionId) => {
    return axiosClient.post(`/admin/submissions/${submissionId}/confirm`).then(res => res.data);
};

/**
 * Yêu cầu nộp lại (từ chối) một phiếu nộp.
 * @param {number} submissionId - ID của phiếu nộp.
 * @param {string} ly_do - Lý do yêu cầu nộp lại.
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const rejectSubmission = (submissionId, ly_do) => {
    return axiosClient.post(`/admin/submissions/${submissionId}/reject`, { ly_do }).then(res => res.data);
};

/**
 * [MỚI] Lấy lịch sử nộp bài của một nhóm (dành cho Admin).
 * @param {number} phancongId - ID của PHANCONG_DETAI_NHOM
 * @returns {Promise<Array>} Danh sách các lần nộp.
 */
export const getSubmissionsForPhancong = (phancongId) => {
    return axiosClient.get(`/admin/submissions/phancong/${phancongId}`).then(res => res.data);
};