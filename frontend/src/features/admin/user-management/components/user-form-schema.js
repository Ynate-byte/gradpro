import { z } from "zod";

// Định nghĩa schema validation cho form người dùng
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

    sinhvien_details: z.object({
        ID_CHUYENNGANH: z.string(),
        NIENKHOA: z.string(),
        HEDAOTAO: z.string(),
        TEN_LOP: z.string().optional(),
    }).optional(),

    giangvien_details: z.object({
        ID_KHOA_BOMON: z.string(),
        HOCVI: z.string(),
        CHUCVU: z.string().optional().nullable(),
    }).optional(),
}).refine(
    (data) => {
        // Kiểm tra xem các trường thông tin sinh viên có bắt buộc và đã được điền đầy đủ hay chưa
        if (data.ID_VAITRO === "3") {
            return (
                !!data.sinhvien_details?.ID_CHUYENNGANH &&
                !!data.sinhvien_details?.NIENKHOA &&
                !!data.sinhvien_details?.HEDAOTAO
            );
        }
        return true;
    },
    {
        message: "Vui lòng điền đầy đủ thông tin cho sinh viên.",
        path: ["sinhvien_details"],
    }
).refine(
    (data) => {
        // Kiểm tra xem các trường thông tin giảng viên có bắt buộc và đã được điền đầy đủ hay chưa
        if (data.ID_VAITRO === "2") {
            return (
                !!data.giangvien_details?.ID_KHOA_BOMON &&
                !!data.giangvien_details?.HOCVI
            );
        }
        return true;
    },
    {
        message: "Vui lòng điền đầy đủ thông tin cho giảng viên.",
        path: ["giangvien_details"],
    }
);