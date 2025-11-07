import axiosClient from './axiosConfig';

/**
 * Lấy danh sách hội đồng (phân trang, lọc).
 */
export const getHoiDongPaginated = (params) => {
  return axiosClient.get('/admin/hoidong', { params }).then(res => res.data);
};

/**
 * Lấy TẤT CẢ hội đồng (cho dropdown, phân bổ).
 */
export const getAllHoiDong = (params) => {
    // Thêm 'all: true' để lấy tất cả
  return axiosClient.get('/admin/hoidong', { params: { ...params, all: true } }).then(res => res.data);
};

/**
 * Lấy dữ liệu thống kê cho StatCards.
 */
export const getHoiDongStatistics = (planId) => {
  const params = planId ? { kehoach: planId } : {};
  return axiosClient.get('/admin/hoidong/statistics', { params }).then(res => res.data);
};

/**
 * Lấy chi tiết một hội đồng.
 */
export const getHoiDongDetails = (id) => {
  return axiosClient.get(`/admin/hoidong/${id}`).then(res => res.data);
};

/**
 * Cập nhật nhanh phòng (inline edit).
 */
export const updateHoiDongPhong = (id, phong) => {
  return axiosClient.patch(`/admin/hoidong/${id}/update-phong`, { PHONG: phong }).then(res => res.data);
};

/**
 * Xóa hội đồng.
 */
export const deleteHoiDong = (id) => {
  return axiosClient.delete(`/admin/hoidong/${id}`);
};

// ----- CÁC TÙY CHỌN CHO BỘ LỌC -----

export const getKeHoachOptions = () => {
    return axiosClient.get("/admin/hoidong/kehoach-options").then(res => res.data);
}

export const getChuyenNganhOptions = () => {
    return axiosClient.get("/admin/hoidong/chuyennganh-options").then(res => res.data);
}