import { z } from "zod";

const GIANGVIEN_RELATED_ROLES = ["2", "4", "5"]; // 2: Giảng viên, 4: Giáo vụ, 5: Trưởng khoa

export const userFormSchema = z.object({
    HODEM_VA_TEN: z
        .string()
        .min(3, { message: "Họ và tên phải có ít nhất 3 ký tự." })
        .max(100),
    EMAIL: z.string().email({ message: "Địa chỉ email không hợp lệ." }),
    MA_DINHDANH: z.string().min(3, { message: "Mã định danh không được để trống." }),
    ID_VAITRO: z
        .string()
        .refine((val) => val !== "", { message: "Vui lòng chọn vai trò." }),
    TRANGTHAI_KICHHOAT: z.boolean().default(true),
    
    password: z
        .string()
        .min(6, { message: "Mật khẩu phải có ít nhất 6 ký tự." })
        .optional()
        .or(z.literal('')),

    // ----- SỬA LỖI: Các trường bên trong phải là optional() hoặc nullable() -----
    // Logic .refine() bên dưới sẽ chịu trách nhiệm kiểm tra bắt buộc
    sinhvien_details: z.object({
        ID_CHUYENNGANH: z.string().optional().nullable(),
        NIENKHOA: z.string().optional().nullable(),
        HEDAOTAO: z.string().optional().nullable(),
        TEN_LOP: z.string().optional().nullable(),
    }).optional(),

    giangvien_details: z.object({
        ID_KHOA_BOMON: z.string().optional().nullable(),
        HOCVI: z.string().optional().nullable(),
        CHUCVU: z.string().optional().nullable(),
    }).optional(),
    // ----- KẾT THÚC SỬA LỖI -----

}).refine(
    (data) => {
        // Nếu là Sinh viên (ID "3"), kiểm tra các trường chi tiết
        if (data.ID_VAITRO === "3") {
            return (
                !!data.sinhvien_details &&
                !!data.sinhvien_details.ID_CHUYENNGANH && data.sinhvien_details.ID_CHUYENNGANH !== "" &&
                !!data.sinhvien_details.NIENKHOA && data.sinhvien_details.NIENKHOA !== "" &&
                !!data.sinhvien_details.HEDAOTAO && data.sinhvien_details.HEDAOTAO !== ""
            );
        }
        return true;
    },
    {
        message: "Vui lòng điền đầy đủ Chuyên ngành, Niên khóa, và Hệ ĐT.",
        path: ["sinhvien_details.ID_CHUYENNGANH"], // Gán lỗi vào một trường cụ thể
    }
).refine(
    (data) => {
        // Nếu là Giảng viên/Giáo vụ/Trưởng khoa, kiểm tra các trường chi tiết
        if (GIANGVIEN_RELATED_ROLES.includes(data.ID_VAITRO)) {
            return (
                !!data.giangvien_details &&
                !!data.giangvien_details.ID_KHOA_BOMON && data.giangvien_details.ID_KHOA_BOMON !== "" &&
                !!data.giangvien_details.HOCVI && data.giangvien_details.HOCVI !== ""
            );
        }
        return true;
    },
    {
        message: "Vui lòng điền đầy đủ Khoa/Bộ môn và Học vị.",
        path: ["giangvien_details.ID_KHOA_BOMON"], // Gán lỗi vào một trường cụ thể
    }
);