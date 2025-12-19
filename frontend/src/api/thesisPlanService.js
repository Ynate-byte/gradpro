import axiosClient from './axiosConfig';

// === QUẢN LÝ KẾ HOẠCH (ADMIN) ===
export const getThesisPlans = (params) => {
    return axiosClient.get('/admin/thesis-plans', { params }).then(res => res.data);
};

export const getPlanFilterOptions = () => {
    return axiosClient.get('/admin/thesis-plans/filter-options').then(res => res.data);
};

export const getAllPlans = () => {
    return axiosClient.get('/admin/thesis-plans/list-all').then(res => res.data);
};

export const getThesisPlanById = (id) => {
    return axiosClient.get(`/admin/thesis-plans/${id}`).then(res => res.data);
};

export const createThesisPlan = (data) => {
    return axiosClient.post('/admin/thesis-plans', data).then(res => res.data);
};

export const updateThesisPlan = (id, data) => {
    return axiosClient.put(`/admin/thesis-plans/${id}`, data).then(res => res.data);
};

export const deleteThesisPlan = (id) => {
    return axiosClient.delete(`/admin/thesis-plans/${id}`);
};

export const submitForApproval = (id) => {
    return axiosClient.post(`/admin/thesis-plans/${id}/submit-approval`).then(res => res.data);
};

export const approvePlan = (id) => {
    return axiosClient.post(`/admin/thesis-plans/${id}/approve`).then(res => res.data);
};

export const requestChanges = (id, comment) => {
    return axiosClient.post(`/admin/thesis-plans/${id}/request-changes`, { comment }).then(res => res.data);
};

export const activatePlan = (id) => {
    return axiosClient.post(`/admin/thesis-plans/${id}/activate`).then(res => res.data);
};

export const exportPlanDocument = (id) => {
    return axiosClient.get(`/admin/thesis-plans/${id}/export-document`, {
        responseType: 'blob',
    }).then(res => res.data);
};

export const previewPlanDocument = (id) => {
    return axiosClient.get(`/admin/thesis-plans/${id}/preview-document`, {
        responseType: 'blob',
    }).then(res => res.data);
};

export const previewNewPlan = (data) => {
    return axiosClient.post('/admin/thesis-plans/preview-new', data, {
        responseType: 'blob',
    }).then(res => res.data);
};

export const archivePlan = (id, includeFiles = false) => {
    return axiosClient.get(`/admin/thesis-plans/${id}/archive`, {
        params: { include_files: includeFiles ? 1 : 0 },
        responseType: 'blob', // Quan trọng: Để tải file binary
    });
};

export const restorePlan = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return axiosClient.post('/admin/thesis-plans/restore', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }).then(res => res.data);
};

export const getThesisPlanTemplates = () => {
    return axiosClient.get('/thesis-plan-templates').then(res => res.data);
};

export const getThesisPlanTemplateDetails = (id) => {
    return axiosClient.get(`/thesis-plan-templates/${id}`).then(res => res.data);
};

// === QUẢN LÝ MẪU KẾ HOẠCH (ADMIN) ===
export const getAdminThesisPlanTemplates = () => {
    return axiosClient.get('/admin/thesis-plan-templates').then(res => res.data);
};

export const getAdminThesisPlanTemplateById = (id) => {
    return axiosClient.get(`/admin/thesis-plan-templates/${id}`).then(res => res.data);
};

export const createAdminThesisPlanTemplate = (data) => {
    return axiosClient.post('/admin/thesis-plan-templates', data).then(res => res.data);
};

export const updateAdminThesisPlanTemplate = (id, data) => {
    return axiosClient.put(`/admin/thesis-plan-templates/${id}`, data).then(res => res.data);
};

export const deleteAdminThesisPlanTemplate = (id) => {
    return axiosClient.delete(`/admin/thesis-plan-templates/${id}`);
};

// === QUẢN LÝ SINH VIÊN THAM GIA KẾ HOẠCH ===
export const getPlanParticipants = (planId, params) => {
    return axiosClient.get(`/admin/thesis-plans/${planId}/participants`, { params }).then(res => res.data);
};

export const searchStudentsForPlan = (planId, searchTerm) => {
    return axiosClient.get(`/admin/thesis-plans/${planId}/search-students`, { params: { search: searchTerm } }).then(res => res.data);
};

export const addParticipantsToPlan = (planId, studentIds, du_dieukien = true) => {
    return axiosClient.post(`/admin/thesis-plans/${planId}/participants`, { student_ids: studentIds, du_dieukien }).then(res => res.data);
};

export const updateParticipantEligibility = (planId, participantId, isEligible) => {
    return axiosClient.put(`/admin/thesis-plans/${planId}/participants/${participantId}`, { DU_DIEUKIEN: isEligible }).then(res => res.data);
};

export const removeParticipantFromPlan = (planId, participantId) => {
    return axiosClient.delete(`/admin/thesis-plans/${planId}/participants/${participantId}`);
};

export const bulkRemoveParticipantsFromPlan = (planId, participantIds) => {
    return axiosClient.post(`/admin/thesis-plans/${planId}/participants/bulk-remove`, { participant_ids: participantIds })
        .then(res => res.data);
};


export const analyzePlanImport = (planId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post(`/admin/thesis-plans/${planId}/import-analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data);
};

export const previewPlanImport = (planId, file, mapping, defaults, headerRowIndex, dataRowStartIndex) => {
    const formData = new FormData();
    formData.append('file', file);

    // Mapping
    formData.append('mapping[ma_dinh_danh]', mapping.ma_dinh_danh || '');
    (mapping.ho_ten || []).forEach((col, i) => {
        formData.append(`mapping[ho_ten][${i}]`, col);
    });
    formData.append('mapping[ngay_sinh]', mapping.ngay_sinh || '');
    formData.append('mapping[ten_lop]', mapping.ten_lop || '');
    formData.append('mapping[nien_khoa][source]', mapping.nien_khoa?.source || 'none');
    formData.append('mapping[nien_khoa][value]', mapping.nien_khoa?.value || '');
    formData.append('mapping[nien_khoa][prefix]', mapping.nien_khoa?.prefix || '');
    formData.append('mapping[nien_khoa][length]', mapping.nien_khoa?.length || 0);

    // Defaults
    formData.append('defaults[ID_CHUYENNGANH]', defaults.ID_CHUYENNGANH);
    formData.append('defaults[HEDAOTAO]', defaults.HEDAOTAO);
    formData.append('defaults[ID_VAITRO]', defaults.ID_VAITRO);

    // Index
    formData.append('headerRowIndex', headerRowIndex);
    formData.append('dataRowStartIndex', dataRowStartIndex);

    return axiosClient.post(`/admin/thesis-plans/${planId}/import-preview`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data);
};

export const processPlanImport = (planId, validRows, defaults) => {
    if (!Array.isArray(validRows)) {
        return Promise.reject(new Error('validRows phải là mảng'));
    }

    const sanitizedRows = validRows.map((row, index) => {
        if (!row || typeof row !== 'object') return null;
        if (!row.action || !['link', 'create_and_link'].includes(row.action)) return null;
        if (!row.data || typeof row.data !== 'object') return null;
        return row;
    }).filter(Boolean);

    if (sanitizedRows.length === 0) {
        return Promise.reject(new Error('Không có dòng hợp lệ để import'));
    }

    const payload = {
        validRows: sanitizedRows,
        defaults: defaults
    };

    return axiosClient.post(`/admin/thesis-plans/${planId}/import-process`, payload)
        .then(res => res.data);
};

export const getPlanSettings = (planId) => {
    return axiosClient.get(`/admin/thesis-plans/${planId}/settings`).then(res => res.data);
};

export const updatePlanSettings = (planId, settings) => {
    return axiosClient.put(`/admin/thesis-plans/${planId}/settings`, settings).then(res => res.data);
};