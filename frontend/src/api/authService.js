import axiosClient from './axiosConfig';

/**
 * Gửi yêu cầu đăng nhập đến server.
 * @param {string} identifier - Email hoặc Mã số sinh viên của người dùng.
 * @param {string} password - Mật khẩu của người dùng.
 * @returns {Promise<object>} Dữ liệu trả về từ API, bao gồm user và access_token.
 */
export const login = async (identifier, password) => {
    const response = await axiosClient.post('/login', { identifier, password });
    return response.data;
};

/**
 * Gửi yêu cầu đăng xuất đến server.
 * @returns {Promise<object>} Dữ liệu trả về từ API.
 */
export const logout = async () => {
    const response = await axiosClient.post('/logout');
    return response.data;
};