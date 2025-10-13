import axiosClient from './axiosConfig';

export const getUsers = async (params) => {
    const response = await axiosClient.get('/users', { params });
    return response.data;
};

export const getUser = async (id) => {
    const response = await axiosClient.get(`/users/${id}`);
    return response.data;
};

export const createUser = async (userData) => {
    const response = await axiosClient.post('/users', userData);
    return response.data;
};

export const updateUser = async (id, userData) => {
    const response = await axiosClient.put(`/users/${id}`, userData);
    return response.data;
};

export const deleteUser = async (id) => {
    await axiosClient.delete(`/users/${id}`);
};

export const resetPassword = async (id) => {
    const response = await axiosClient.post(`/users/${id}/reset-password`);
    return response.data;
};

export const performBulkAction = async (payload) => {
    const response = await axiosClient.post('/users/bulk-action', payload);
    return response.data;
};

export const performBulkDelete = async (userIds) => {
    const response = await axiosClient.post('/users/bulk-delete', { userIds });
    return response.data;
};

export const downloadImportTemplate = async () => {
    const response = await axiosClient.get('/users/import/template', {
        responseType: 'blob',
    });
    return response.data;
};

export const previewImport = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosClient.post('/users/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export const processImport = async (validRows) => {
    const response = await axiosClient.post('/users/import/process', { validRows });
    return response.data;
};

export const getRoles = async () => {
    const response = await axiosClient.get('/roles');
    return response.data;
};

export const getChuyenNganhs = async () => {
    const response = await axiosClient.get('/chuyen-nganhs');
    return response.data;
};

export const getKhoaBomons = async () => {
    const response = await axiosClient.get('/khoa-bo-mons');
    return response.data;
};