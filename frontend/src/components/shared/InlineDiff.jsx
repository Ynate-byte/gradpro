import React, { useMemo } from 'react';
import * as Diff from 'diff';
import { ArrowRight, FileX } from 'lucide-react';

const InlineDiff = ({ oldValue = "", newValue = "", className }) => {
    // Chuyển đổi sang string để đảm bảo không lỗi
    const strOld = String(oldValue || "");
    const strNew = String(newValue || "");

    // 1. Trường hợp không có gì thay đổi
    if (strOld === strNew) {
        return <div className={className}>{strNew}</div>;
    }

    // Hiển thị rõ icon báo "Trước đó để trống"
    if (!strOld && strNew) {
        return (
            <div className={`flex flex-col gap-1 ${className}`}>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500 border border-gray-200 border-dashed">
                        <FileX className="w-3 h-3" /> (Trước đó để trống)
                    </span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-medium text-green-600">Nội dung mới:</span>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 pl-3 py-1 text-green-800 dark:text-green-300">
                    {strNew}
                </div>
            </div>
        );
    }

    if (strOld && !strNew) {
        return (
            <div className={`flex flex-col gap-1 ${className}`}>
                 <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="font-medium text-red-600">Nội dung cũ:</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-500 border border-gray-200 border-dashed">
                        <FileX className="w-3 h-3" /> (Đã xóa hết)
                    </span>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 pl-3 py-1 text-red-800 dark:text-red-300 line-through opacity-80">
                    {strOld}
                </div>
            </div>
        );
    }

    // 4. Trường hợp nội dung ngắn (< 50 ký tự) -> Hiển thị so sánh trái/phải cho dễ nhìn
    if (strOld.length < 50 && strNew.length < 50) {
        return (
            <div className={`flex flex-wrap items-center gap-2 ${className}`}>
                <span className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-1.5 py-0.5 rounded decoration-2 line-through decoration-red-500 text-sm border border-red-200 dark:border-red-900">
                    {strOld}
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800 font-medium text-sm">
                    {strNew}
                </span>
            </div>
        );
    }

    // 5. Trường hợp nội dung dài -> Dùng thuật toán Diff tô màu
    const diffs = useMemo(() => {
        // Sử dụng diffWords để so sánh theo từ, tránh bị nát chữ tiếng Việt
        return Diff.diffWords(strOld, strNew);
    }, [strOld, strNew]);

    return (
        <div className={`leading-7 whitespace-pre-wrap ${className}`}>
            {diffs.map((part, index) => {
                if (part.removed) {
                    return (
                        <span 
                            key={index} 
                            className="bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-200 line-through decoration-red-400 px-1 rounded mx-0.5 select-none opacity-70 border border-red-200 dark:border-red-900"
                            title="Nội dung cũ"
                        >
                            {part.value}
                        </span>
                    );
                }
                if (part.added) {
                    return (
                        <span 
                            key={index} 
                            className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200 font-semibold px-1 rounded border-b-2 border-green-500 mx-0.5"
                            title="Nội dung mới"
                        >
                            {part.value}
                        </span>
                    );
                }
                return <span key={index}>{part.value}</span>;
            })}
        </div>
    );
};

export default InlineDiff;