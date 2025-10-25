import axios from 'axios';

/**
 * Cấu hình instance mặc định cho Axios.
 */
const axiosClient = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

/**
 * Interceptor để tự động đính kèm token xác thực vào mỗi request.
 */
axiosClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/**
 * Interceptor để xử lý lỗi, đặc biệt là lỗi 401 (Unauthorized).
 * Nếu nhận lỗi 401, sẽ tự động xóa thông tin đăng nhập và chuyển hướng về trang login.
 */
axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('user');
            
            if (window.location.pathname !== '/login') {
                 window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axiosClient;