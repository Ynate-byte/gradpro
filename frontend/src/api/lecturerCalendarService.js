import axiosClient from './axiosConfig';

export const getLecturerGroups = () => {
    return axiosClient.get('/lecturer/calendar/groups').then(res => res.data);
};

export const getLecturerSchedule = (params) => {
    return axiosClient.get('/lecturer/calendar/events', { params }).then(res => res.data);
};

export const createQuickMeeting = (groupId, startTime) => {
    return axiosClient.post('/lecturer/calendar/create-quick', {
        ID_NHOM: groupId,
        START_TIME: startTime
    }).then(res => res.data);
};

export const updateMeeting = (id, data) => {
    return axiosClient.put(`/lichhop/${id}`, data).then(res => res.data);
};

export const rateMeeting = (meetingId, rating) => {
    return axiosClient.put(`/lecturer/calendar/rate/${meetingId}`, { DANHGIA: rating }).then(res => res.data);
};