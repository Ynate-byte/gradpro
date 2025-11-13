import axiosClient from './axiosConfig';

/**
 * Lấy danh sách lịch họp của một nhóm (sắp tới, đã qua, đã hủy).
 * @param {number} nhomId - ID của nhóm.
 * @param {object} params - {start_date, end_date}
 * @returns {Promise<Array>} Danh sách các lịch họp.
 */
export const getMeetingsForGroup = (nhomId, params = {}) => { 
    return axiosClient.get(`/lichhop/nhom/${nhomId}`, { params }).then(res => res.data);
};

/**
 * Tạo một lịch họp mới cho nhóm.
 * (Yêu cầu quyền Nhóm trưởng hoặc GVHD).
 * @param {number} nhomId - ID của nhóm.
 * @param {object} data - Dữ liệu lịch họp (TIEUDE_LICHHOP, THOIGIAN_BATDAU, ...).
 * @returns {Promise<object>} Dữ liệu lịch họp vừa tạo.
 */
export const createMeeting = (nhomId, data) => {
    return axiosClient.post(`/lichhop/nhom/${nhomId}`, data).then(res => res.data);
};

/**
 * Cập nhật một lịch họp đã có.
 * (Yêu cầu quyền của người tạo lịch họp).
 * @param {number} lichHopId - ID của lịch họp.
 * @param {object} data - Dữ liệu cần cập nhật.
 * @returns {Promise<object>} Dữ liệu lịch họp sau khi cập nhật.
 */
export const updateMeeting = (lichHopId, data) => {
    return axiosClient.put(`/lichhop/${lichHopId}`, data).then(res => res.data);
};

/**
 * Hủy một lịch họp.
 * (Yêu cầu quyền của người tạo lịch họp).
 * @param {number} lichHopId - ID của lịch họp.
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const cancelMeeting = (lichHopId) => {
    return axiosClient.delete(`/lichhop/${lichHopId}`).then(res => res.data);
};