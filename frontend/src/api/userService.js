import axiosClient from './axiosConfig';

/**
 * Lấy danh sách người dùng với các tham số.
 * @param {object} params - Các tham số lọc, phân trang, sắp xếp.
 * @returns {Promise<object>} Dữ liệu phân trang của người dùng.
 */
export const getUsers = async (params) => {
    const response = await axiosClient.get('/users', { params });
    return response.data;
};

/**
 * Lấy thông tin chi tiết một người dùng.
 * @param {number} id - ID người dùng.
 * @returns {Promise<object>} Dữ liệu người dùng.
 */
export const getUser = async (id) => {
    const response = await axiosClient.get(`/users/${id}`);
    return response.data;
};

/**
 * Tạo người dùng mới.
 * @param {object} userData - Dữ liệu người dùng.
 * @returns {Promise<object>} Dữ liệu người dùng vừa tạo.
 */
export const createUser = async (userData) => {
    const response = await axiosClient.post('/users', userData);
    return response.data;
};

/**
 * Cập nhật thông tin người dùng.
 * @param {number} id - ID người dùng.
 * @param {object} userData - Dữ liệu cần cập nhật.
 * @returns {Promise<object>} Dữ liệu người dùng sau khi cập nhật.
 */
export const updateUser = async (id, userData) => {
    const response = await axiosClient.put(`/users/${id}`, userData);
    return response.data;
};

/**
 * Xóa một người dùng.
 * @param {number} id - ID người dùng.
 * @returns {Promise}
 */
export const deleteUser = async (id) => {
    await axiosClient.delete(`/users/${id}`);
};

/**
 * Đặt lại mật khẩu của người dùng về mặc định.
 * @param {number} id - ID người dùng.
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const resetPassword = async (id) => {
    const response = await axiosClient.post(`/users/${id}/reset-password`);
    return response.data;
};

/**
 * Thực hiện hành động hàng loạt (kích hoạt/vô hiệu hóa).
 * @param {object} payload - Gồm action và mảng userIds.
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const performBulkAction = async (payload) => {
    const response = await axiosClient.post('/users/bulk-action', payload);
    return response.data;
};

/**
 * Xóa hàng loạt người dùng.
 * @param {Array<number>} userIds - Mảng ID người dùng cần xóa.
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const performBulkDelete = async (userIds) => {
    const response = await axiosClient.post('/users/bulk-delete', { userIds });
    return response.data;
};

/**
 * Đặt lại mật khẩu hàng loạt cho người dùng.
 * @param {Array<number>} userIds - Mảng ID người dùng.
 * @returns {Promise<object>} Thông báo kết quả.
 */
export const bulkResetPassword = async (userIds) => {
    const response = await axiosClient.post('/users/bulk-reset-password', { userIds });
    return response.data;
};

/**
 * Tải file mẫu excel để import người dùng.
 * @returns {Promise<Blob>} Dữ liệu file blob.
 */
export const downloadImportTemplate = async () => {
    const response = await axiosClient.get('/users/import/template', {
        responseType: 'blob',
    });
    return response.data;
};

/**
 * Gửi file excel lên để xem trước dữ liệu import.
 * @param {File} file - File excel chứa dữ liệu người dùng.
 * @returns {Promise<object>} Dữ liệu đã được xác thực (validRows, invalidRows).
 */
export const previewImport = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosClient.post('/users/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

/**
 * Xử lý import các dòng dữ liệu hợp lệ.
 * @param {Array<object>} validRows - Mảng các dòng dữ liệu hợp lệ từ bước xem trước.
 * @returns {Promise<object>} Thông báo kết quả import.
 */
export const processImport = async (validRows) => {
    const response = await axiosClient.post('/users/import/process', { validRows });
    return response.data;
};

/**
 * Lấy danh sách các vai trò.
 * @returns {Promise<Array>} Mảng các vai trò.
 */
export const getRoles = async () => {
    const response = await axiosClient.get('/roles');
    return response.data;
};

/**
 * Lấy danh sách các chuyên ngành.
 * @returns {Promise<Array>} Mảng các chuyên ngành.
 */
export const getChuyenNganhs = async () => {
    const response = await axiosClient.get('/chuyen-nganhs');
    return response.data;
};

/**
 * Lấy danh sách các khoa/bộ môn.
 * @returns {Promise<Array>} Mảng các khoa/bộ môn.
 */
export const getKhoaBomons = async () => {
    const response = await axiosClient.get('/khoa-bo-mons');
    return response.data;
};
