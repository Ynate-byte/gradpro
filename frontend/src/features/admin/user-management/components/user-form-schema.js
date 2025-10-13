import { z } from "zod";

// Schema validation cho form người dùng
export const userFormSchema = z.object({
    HODEM_VA_TEN: z.string().min(3, { message: "Họ và tên phải có ít nhất 3 ký tự." }).max(100),
    EMAIL: z.string().email({ message: "Địa chỉ email không hợp lệ." }),
    MA_DINHDANH: z.string().min(3, { message: "Mã định danh không được để trống." }),
    ID_VAITRO: z.string().refine(val => val !== "", { message: "Vui lòng chọn vai trò." }),
    TRANGTHAI_KICHHOAT: z.boolean().default(true),

    // Thông tin chi tiết cho sinh viên, chỉ yêu cầu nếu là sinh viên
    sinhvien_details: z.object({
        ID_CHUYENNGANH: z.string(),
        NIENKHOA: z.string(),
        HEDAOTAO: z.string(),
        TEN_LOP: z.string().optional(),
    }).optional(),

    // Thông tin chi tiết cho giảng viên, chỉ yêu cầu nếu là giảng viên
    giangvien_details: z.object({
        ID_KHOA_BOMON: z.string(),
        HOCVI: z.string(),
    }).optional(),

}).refine((data) => {
    // Nếu là Sinh viên (ID_VAITRO = 3), thì các trường của sinh viên là bắt buộc
    if (data.ID_VAITRO === "3") {
        return !!data.sinhvien_details?.ID_CHUYENNGANH && !!data.sinhvien_details?.NIENKHOA && !!data.sinhvien_details?.HEDAOTAO;
    }
    return true;
}, {
    message: "Vui lòng điền đầy đủ thông tin cho sinh viên.",
    path: ["sinhvien_details"], // Báo lỗi ở nhóm field này
}).refine((data) => {
    // Nếu là Giảng viên (ID_VAITRO = 2), thì các trường của giảng viên là bắt buộc
    if (data.ID_VAITRO === "2") {
        return !!data.giangvien_details?.ID_KHOA_BOMON && !!data.giangvien_details?.HOCVI;
    }
    return true;
}, {
    message: "Vui lòng điền đầy đủ thông tin cho giảng viên.",
    path: ["giangvien_details"],
});