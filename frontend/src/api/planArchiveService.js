import axiosClient from './axiosConfig';

/**
 * Tải file backup của một kế hoạch cụ thể
 */
export const archivePlan = (planId, includeFiles = false) => {
    return axiosClient.get(`/admin/thesis-plans/${planId}/archive`, {
        params: { include_files: includeFiles }, // Truyền params
        responseType: 'blob'
    });
};

/**
 * Phục hồi kế hoạch từ file ZIP
 */
export const restorePlan = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return axiosClient.post('/admin/thesis-plans/restore', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }).then(res => res.data);
};