import axiosClient from "./axiosConfig";

// Cập nhật thông tin chung
export const updateProfile = async (data) => {
    // data bao gồm: email, sdt, id_chuyennganh (nếu là sv)
    const response = await axiosClient.put('/user/profile', data);
    return response.data;
};

// Đổi mật khẩu
export const changePassword = async (data) => {
    // data bao gồm: current_password, new_password, new_password_confirmation
    const response = await axiosClient.put('/user/change-password', data);
    return response.data;
};