import axios from 'axios';

const axiosClient = axios.create({
    baseURL: '/api', 
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

axiosClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

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