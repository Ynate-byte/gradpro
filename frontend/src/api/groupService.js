import axiosClient from './axiosConfig'

/**
 * 🧩 Nhóm API cho chức năng Quản lý Nhóm (Group Management)
 */

/* ------------------------------------------------------------
 * 1️⃣ Nhóm hiện tại của người dùng
 * ------------------------------------------------------------ */
export const getMyGroup = async (params) => {
  const { data } = await axiosClient.get('/nhom/my-group', { params })
  return data
}

/* ------------------------------------------------------------
 * 2️⃣ Các kế hoạch hoạt động mà sinh viên tham gia
 * ------------------------------------------------------------ */
export const getMyActivePlans = async () => {
  const { data } = await axiosClient.get('/student/my-active-plans')
  return data
}

/* ------------------------------------------------------------
 * 3️⃣ Danh sách lời mời đang chờ xử lý
 * ------------------------------------------------------------ */
export const getPendingInvitations = async (params) => {
  const { data } = await axiosClient.get('/invitations', { params })
  return data
}

/* ------------------------------------------------------------
 * 4️⃣ Tạo nhóm mới
 * ------------------------------------------------------------ */
export const createGroup = async (groupData, planId) => {
  const payload = { ...groupData, ID_KEHOACH: planId }
  const { data } = await axiosClient.post('/nhom', payload)
  return data
}

/* ------------------------------------------------------------
 * 5️⃣ Mời thành viên vào nhóm
 * ------------------------------------------------------------ */
export const inviteMember = async (groupId, invitationData) => {
  const { data } = await axiosClient.post(`/nhom/${groupId}/invite`, invitationData)
  return data
}

/* ------------------------------------------------------------
 * 6️⃣ Xử lý lời mời (chấp nhận / từ chối)
 * ------------------------------------------------------------ */
export const handleInvitation = async (invitationId, action) => {
  const { data } = await axiosClient.post(`/invitations/${invitationId}/handle`, { action })
  return data
}

/* ------------------------------------------------------------
 * 7️⃣ Tìm kiếm nhóm đang mở trong một kế hoạch
 * ------------------------------------------------------------ */
export const findGroups = async (params, planId) => {
  const allParams = { ...params, ID_KEHOACH: planId }
  const { data } = await axiosClient.get('/nhom/find', { params: allParams })
  return data
}

/* ------------------------------------------------------------
 * 8️⃣ Gửi yêu cầu xin tham gia nhóm
 * ------------------------------------------------------------ */
export const requestToJoin = async (groupId, data) => {
  const { data: result } = await axiosClient.post(`/nhom/${groupId}/request-join`, data)
  return result
}

/* ------------------------------------------------------------
 * 9️⃣ Xử lý yêu cầu xin tham gia (chấp nhận / từ chối)
 * ------------------------------------------------------------ */
export const handleJoinRequest = async (groupId, requestId, action) => {
  const { data } = await axiosClient.post(`/nhom/${groupId}/requests/${requestId}/handle`, { action })
  return data
}

/* ------------------------------------------------------------
 * 🔟 Rời khỏi nhóm
 * ------------------------------------------------------------ */
export const leaveGroup = async (planId) => {
  const { data } = await axiosClient.post('/nhom/leave', { plan_id: planId })
  return data
}

/* ------------------------------------------------------------
 * 1️⃣1️⃣ Chuyển quyền trưởng nhóm
 * ------------------------------------------------------------ */
export const transferGroupLeadership = async (groupId, newLeaderId) => {
  const { data } = await axiosClient.post(`/nhom/${groupId}/transfer-leadership/${newLeaderId}`)
  return data
}

/* ------------------------------------------------------------
 * 1️⃣2️⃣ Hủy yêu cầu tham gia (do sinh viên gửi)
 * ------------------------------------------------------------ */
export const cancelJoinRequest = async (requestId) => {
  const { data } = await axiosClient.post(`/requests/${requestId}/cancel`)
  return data
}

/* ------------------------------------------------------------
 * 1️⃣3️⃣ Hủy lời mời (do nhóm trưởng gửi)
 * ------------------------------------------------------------ */
export const cancelInvitation = async (groupId, invitationId) => {
  const { data } = await axiosClient.post(`/nhom/${groupId}/invitations/${invitationId}/cancel`)
  return data
}

/* ----- 🚀 BẮT ĐẦU API NỘP SẢN PHẨM 🚀 ----- */

/**
 * 1️⃣4️⃣ Lấy lịch sử các lần nộp sản phẩm của nhóm.
 * @param {number} phancongId - ID của PHANCONG_DETAI_NHOM
 * @returns {Promise<Array>} Danh sách các lần nộp.
 */
export const getSubmissions = async (phancongId) => {
    const { data } = await axiosClient.get(`/nhom/submissions/${phancongId}`);
    return data;
};

/**
 * 1️⃣5️⃣ Nộp sản phẩm (báo cáo, source code, links).
 * @param {number} phancongId - ID của PHANCONG_DETAI_NHOM
 * @param {FormData} formData - Dữ liệu form chứa file và links.
 * @returns {Promise<object>} Kết quả nộp.
 */
export const submitProduct = async (phancongId, formData) => {
    const { data } = await axiosClient.post(`/nhom/submissions/${phancongId}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return data;
};

/* ----- 🚀 KẾT THÚC API NỘP SẢN PHẨM 🚀 ----- */