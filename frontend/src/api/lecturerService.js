import axiosClient from './axiosConfig';

/**
 * Lấy dữ liệu thống kê cho Bảng điều khiển của Giảng viên.
 */
export const getLecturerDashboardStats = () => {
    return axiosClient.get('/giangvien/dashboard-stats').then(res => res.data);
};

// (Bạn có thể gộp các hàm API khác của giảng viên vào đây nếu muốn)