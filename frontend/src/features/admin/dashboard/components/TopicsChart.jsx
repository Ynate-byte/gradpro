import React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

const TopicsChart = ({ plans }) => {
    // Chuẩn bị dữ liệu cho biểu đồ
    const data = plans.map(plan => ({
        name: plan.name,
        created: plan.topics_current || 0,      // Đề tài đã tạo
        assigned: plan.groups_registered || 0,  // Đề tài đã giao (số nhóm đã đăng ký)
    }));

    if (!data || data.length === 0) return null;

    return (
        <Card className="col-span-1 xl:col-span-2 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" /> 
                    Thống kê Đề tài theo Kế hoạch
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} barSize={40}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                            <XAxis 
                                dataKey="name" 
                                stroke="#888888" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false}
                                tickFormatter={(value) => value.length > 20 ? `${value.substring(0, 20)}...` : value} 
                            />
                            <YAxis 
                                stroke="#888888" 
                                fontSize={12} 
                                tickLine={false} 
                                axisLine={false} 
                                allowDecimals={false}
                            />
                            <Tooltip 
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar 
                                dataKey="created" 
                                name="Đã tạo" 
                                fill="#3b82f6" // Blue-500
                                radius={[4, 4, 0, 0]} 
                            />
                            <Bar 
                                dataKey="assigned" 
                                name="Đã giao (Có nhóm)" 
                                fill="#22c55e" // Green-500
                                radius={[4, 4, 0, 0]} 
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

export default TopicsChart;