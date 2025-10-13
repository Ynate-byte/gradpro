import axiosClient from './axiosConfig';

/**
 * Gửi yêu cầu đăng nhập đến server.
 * @param {string} email - Email của người dùng.
 * @param {string} password - Mật khẩu của người dùng.
 * @returns {Promise<object>} Dữ liệu trả về từ API, bao gồm user và access_token.
 */
export const login = async (email, password) => {
    // try...catch sẽ được xử lý ở component để hiển thị lỗi ra UI
    const response = await axiosClient.post('/login', { email, password });
    return response.data; // Chỉ trả về phần data của response
};

/**
 * Gửi yêu cầu đăng xuất đến server.
 * @returns {Promise<object>} Dữ liệu trả về từ API.
 */
export const logout = async () => {
    const response = await axiosClient.post('/logout');
    return response.data;
};

// Bạn cũng có thể thêm các hàm khác ở đây trong tương lai, ví dụ:
/**
 * Lấy thông tin người dùng hiện tại.
 * @returns {Promise<object>} Dữ liệu người dùng.
 */
// export const fetchUser = async () => {
//     const response = await axiosClient.get('/user');
//     return response.data;
// };