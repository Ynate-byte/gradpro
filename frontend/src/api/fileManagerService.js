import axiosClient from './axiosConfig';

export const getFiles = (folderPath = '/') => {
    return axiosClient.get('/admin/file-manager', { params: { folder: folderPath } }).then(res => res.data);
};

export const createFolder = (path, name) => {
    return axiosClient.post('/admin/file-manager/create-folder', { path, name }).then(res => res.data);
};

export const uploadFiles = (path, files) => {
    const formData = new FormData();
    formData.append('path', path);
    // files là FileList hoặc mảng File
    Array.from(files).forEach(file => {
        formData.append('files[]', file);
    });
    
    return axiosClient.post('/admin/file-manager/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
};

export const deleteFileOrFolder = (path) => {
    return axiosClient.post('/admin/file-manager/delete', { path }).then(res => res.data);
};

export const bulkDelete = (items) => {
    return axiosClient.post('/admin/file-manager/bulk-delete', { items }).then(res => res.data);
};

// Helper tải xuống
const triggerDownload = (blob, fileName) => {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

export const downloadItem = async (path) => {
    const response = await axiosClient.get('/admin/file-manager/download', {
        params: { path },
        responseType: 'blob'
    });
    
    // Lấy tên file từ path
    let fileName = path.split('/').pop();
    // Nếu response là zip (header content-type), thêm .zip nếu chưa có
    if (response.data.type === 'application/zip' && !fileName.endsWith('.zip')) {
        fileName += '.zip';
    }
    triggerDownload(response.data, fileName);
};

export const bulkDownloadItems = async (paths) => {
    const response = await axiosClient.post('/admin/file-manager/bulk-download', { paths }, {
        responseType: 'blob'
    });
    
    // Tên file zip
    const fileName = paths.length === 1 
        ? paths[0].split('/').pop() + (response.data.type === 'application/zip' && !paths[0].endsWith('.zip') ? '.zip' : '')
        : `archive_${new Date().getTime()}.zip`;
        
    triggerDownload(response.data, fileName);
};