import { isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';

/**
 * Hook kiểm tra tính năng có được bật hay không dựa trên Kế hoạch.
 * @param {object} plan - Object kế hoạch (chứa cột SETTINGS)
 * @param {string} featureKey - Key chức năng (VD: 'SV_TAO_NHOM', 'SV_NOP_BAI')
 * @returns {boolean} True nếu được phép
 */
export const useFeatureFlag = (plan, featureKey) => {
    if (!plan || !plan.SETTINGS) {
        // Nếu không có setting, mặc định là KHÓA để an toàn
        return false;
    }

    const config = plan.SETTINGS[featureKey];
    if (!config) return false;

    // 1. Ưu tiên chế độ Manual Override (Bắt buộc Mở/Đóng)
    if (config.manual_override === 'ENABLED') return true;
    if (config.manual_override === 'DISABLED') return false;

    // 2. Kiểm tra theo ngày tháng (Chế độ AUTO)
    if (!config.start || !config.end) return false;

    try {
        const now = new Date();
        // startOfDay: Bắt đầu từ 00:00:00 của ngày start
        const start = startOfDay(parseISO(config.start));
        // endOfDay: Kết thúc lúc 23:59:59 của ngày end
        const end = endOfDay(parseISO(config.end));

        return isWithinInterval(now, { start, end });
    } catch (error) {
        console.error("Date parsing error in feature flag:", error);
        return false;
    }
};