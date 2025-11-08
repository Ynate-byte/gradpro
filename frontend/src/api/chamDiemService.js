import axiosClient from './axiosConfig';

/**
 * 🧩 Nhóm API cho chức năng Chấm Điểm
 */

// ===========================================
// === API CHO GIẢNG VIÊN (TỰ CHẤM) ===
// ===========================================

/**
 * Lấy danh sách tất cả các nhóm Giảng viên cần chấm (HD, PB, HĐ).
 * @returns {Promise<{huongdan: Array, phanbien: Array, hoidong: Array}>}
 */
export const getMyGradingTasks = () => {
  return axiosClient.get('/chamdiem/my-tasks').then(res => res.data);
};

/**
 * Nộp điểm Hướng Dẫn.
 * @param {number} nhomId
 * @param {{DIEM: number, NHANXET: string}} data
 */
export const submitHuongDan = (nhomId, data) => {
  return axiosClient.post(`/chamdiem/huongdan/${nhomId}`, data).then(res => res.data);
};

/**
 * Nộp điểm Phản Biện.
 * @param {number} nhomId
 * @param {{DIEM: number, NHANXET: string}} data
 */
export const submitPhanBien = (nhomId, data) => {
  return axiosClient.post(`/chamdiem/phanbien/${nhomId}`, data).then(res => res.data);
};

/**
 * Nộp điểm Hội Đồng.
 * @param {number} nhomId
 * @param {{DIEM: number, NHANXET: string}} data
 */
export const submitHoiDong = (nhomId, data) => {
  return axiosClient.post(`/chamdiem/hoidong/${nhomId}`, data).then(res => res.data);
};

// ===========================================
// === API CHO ADMIN (NHẬP ĐIỂM HỘ) ===
// ===========================================

/**
 * [ADMIN] Lấy thông tin nhóm chi tiết để chấm điểm (bao gồm GVHD, GVPB, HĐ).
 * @param {number} nhomId
 */
export const getNhomInfoForGrading = (nhomId) => {
  return axiosClient.get(`/chamdiem/nhom/${nhomId}`).then(res => res.data);
};

/**
 * [ADMIN] Lấy điểm tổng kết và điểm chi tiết đã có của nhóm.
 * @param {number} nhomId
 */
export const getSavedScoresForGroup = (nhomId) => {
    return axiosClient.get(`/chamdiem/tongket/${nhomId}`).then(res => res.data);
}

/**
 * [ADMIN] Lấy tỷ trọng điểm hiện hành.
 */
export const getTyTrongDiem = () => {
    return axiosClient.get('/chamdiem/tytrong').then(res => res.data);
}

/**
 * [ADMIN] Cập nhật tỷ trọng điểm.
 */
export const updateTyTrongDiem = (data) => {
    return axiosClient.post('/chamdiem/tytrong', data).then(res => res.data);
}

/**
 * [ADMIN] Lưu tất cả điểm (nhập hộ).
 * @param {number} nhomId
 * @param {{diem_huongdan: Array, diem_phanbien: Array, diem_hoidong: Array}} payload
 */
export const saveCombinedScores = (nhomId, payload) => {
    return axiosClient.post(`/chamdiem/combined/${nhomId}`, payload).then(res => res.data);
}