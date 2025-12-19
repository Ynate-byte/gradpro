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
 * Cập nhật nhanh tên hội đồng (inline edit).
 */
export const updateHoiDongName = (id, tenHoiDong) => {
    return axiosClient.patch(`/admin/hoidong/${id}/update-name`, { TEN_HOIDONG: tenHoiDong }).then(res => res.data);
};

export const updateHoiDongGio = (id, gioBaoCao) => {
    return axiosClient.patch(`/admin/hoidong/${id}/update-gio`, { GIO_BAOCAO: gioBaoCao }).then(res => res.data);
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

// [THÊM MỚI] Hàm service để nâng cấp Hội đồng
/**
 * Nâng cấp Hội đồng Phản biện lên Hội đồng Bảo vệ.
 * @param {number} id - ID của Hội đồng.
 * @returns {Promise<object>} Dữ liệu Hội đồng sau khi nâng cấp.
 */
export const upgradePhanBienToHoiDong = (id, targetType = 'hoidong') => {
    return axiosClient.post(`/admin/hoidong/${id}/upgrade-to-hoidong`, { target_type: targetType }).then(res => res.data);
};

export const bulkUpgradeHoiDong = (ids, targetType = 'hoidong') => {
  return axiosClient.post('/admin/hoidong/bulk-upgrade', { ids, target_type: targetType }).then(res => res.data);
};

// [THÊM MỚI] Hàm service phân công tự động
/**
 * Tự động phân công thành viên Hội đồng (Chủ tịch, Thư ký, TV).
 * @param {object} payload - { ID_KEHOACH, LOAI, replaceExisting }
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const autoAssignMembers = (payload) => {
    return axiosClient.post('/admin/hoidong/auto-assign-members', payload).then(res => res.data);
};

export const getLecturerWorkload = (planId) => {
    return axiosClient.get('/admin/hoidong/workload-stats', { params: { plan_id: planId } }).then(res => res.data);
};

export const updateHoiDongDetails = (id, data) => {
    return axiosClient.put(`/admin/hoidong/${id}`, data).then(res => res.data);
};

export const autoAssignGroups = (planId, type = 'hoidong') => {
    return axiosClient.post('/admin/hoidong/auto-assign-groups', { 
        ID_KEHOACH: planId,
        LOAI: type
    }).then(res => res.data);
};

export const getAutoCreateStats = (planId) => {
    return axiosClient.get('/admin/hoidong/auto-create-stats', { params: { plan_id: planId } }).then(res => res.data);
};

export const createBulkByDepartment = (data) => {
    return axiosClient.post('/admin/hoidong/create-bulk-department', data).then(res => res.data);
};


export const getHoiDongByGiangVien = () => {
    return axiosClient.get('/giangvien/my-hoidong').then(res => res.data);
};