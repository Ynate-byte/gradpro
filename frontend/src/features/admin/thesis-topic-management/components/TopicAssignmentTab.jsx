import React from 'react';
import QuotaManager from '../../../lecturer/quota-management/components/QuotaManager';

const TopicAssignmentTab = () => {
    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-xl font-semibold">Phân công Đề tài</h2>
                <p className="text-gray-600">Quản lý việc phân công đề tài trong từng kế hoạch khóa luận</p>
            </div>

            <QuotaManager />
        </div>
    );
};

export default TopicAssignmentTab;
