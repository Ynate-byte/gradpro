import axiosClient from './axiosConfig';

export const getBackups = () => {
    return axiosClient.get('/admin/backups').then(res => res.data);
};

export const createBackup = (option = 'full') => {
    return axiosClient.post('/admin/backups', { option }).then(res => res.data);
};

export const deleteBackup = (path) => {
    return axiosClient.post('/admin/backups/delete', { path }).then(res => res.data);
};

export const downloadBackupLink = (path) => {
    return axiosClient.get('/admin/backups/download', { 
        params: { path },
        responseType: 'blob' 
    });
};