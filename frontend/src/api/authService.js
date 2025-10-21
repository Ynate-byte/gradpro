import axiosClient from './axiosConfig';

/**
 * Gửi yêu cầu đăng nhập đến server.
 * @param {string} email - Email của người dùng.
 * @param {string} password - Mật khẩu của người dùng.
 * @returns {Promise<object>} Dữ liệu trả về từ API, bao gồm user và access_token.
 */
export const login = async (email, password) => {
    const response = await axiosClient.post('/login', { email, password });
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
