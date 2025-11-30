import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Loader2, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from "@/components/theme-provider";

const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    description, 
    iconBgClass = "bg-primary/10", 
    iconColorClass = "text-primary", 
    hasStatusDot, 
    onClick, 
    isLoading, 
    isActive,
    className // [MỚI] Cho phép nhận className từ cha để override nếu cần
}) => {
    const shouldReduceMotion = useReducedMotion();
    const { reduceMotion } = useTheme();
    const isReduced = reduceMotion || shouldReduceMotion;

    return (
        <motion.div 
            className={cn(
                // [SỬA] Giảm padding p-4 -> p-3, gap-4 -> gap-3
                "group relative bg-card text-card-foreground p-3 rounded-xl shadow-sm border flex items-center gap-3 transition-all duration-300 h-full overflow-hidden",
                onClick && "cursor-pointer hover:shadow-md hover:border-primary/50",
                isActive ? "border-primary ring-1 ring-primary bg-primary/5" : "",
                className
            )}
            whileHover={isReduced || !onClick ? {} : { y: -2, scale: 1.01 }} // [SỬA] Giảm độ nảy y: -4 -> -2
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={onClick}
        >
            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}

            {onClick && (
                // [SỬA] Chỉnh vị trí mũi tên top-3 -> top-2
                <div className="absolute top-2 right-2 text-muted-foreground/30 group-hover:text-primary transition-colors duration-300">
                    <ArrowRight className="h-4 w-4" />
                </div>
            )}

            <motion.div 
                // [SỬA] Giảm padding icon p-3 -> p-2
                className={cn("p-2 rounded-lg flex-shrink-0", iconBgClass)}
                initial={false}
                animate={isReduced ? {} : { 
                    scale: value === 'loading' || isLoading ? [1, 1.1, 1] : 1,
                }}
                transition={{ 
                    duration: 1.5, 
                    repeat: value === 'loading' || isLoading ? Infinity : 0,
                    ease: "easeInOut"
                }}
            >
                {/* [SỬA] Giảm size icon h-6 w-6 -> h-5 w-5 */}
                {Icon && <Icon className={cn("h-5 w-5", iconColorClass)} />}
            </motion.div>
            
            <div className="flex-1 min-w-0 pr-4">
                <h3 className={cn("text-[11px] font-medium uppercase tracking-wide truncate", isActive ? "text-primary font-bold" : "text-muted-foreground")}>
                    {title}
                </h3>
                
                {/* [SỬA] Giảm chiều cao wrapper h-8 -> h-7, mt-1 -> mt-0.5 */}
                <div className="flex items-baseline gap-2 h-7 overflow-hidden mt-0.5">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isLoading ? 'loading' : value}
                            initial={isReduced ? { opacity: 1 } : { opacity: 0, y: 10 }} // [SỬA] Giảm biên độ animation y: 15 -> 10
                            animate={{ opacity: 1, y: 0 }}
                            exit={isReduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="flex items-baseline gap-2"
                        >
                            {value === 'loading' || isLoading ? (
                                <div className="h-6 w-16 bg-muted/50 animate-pulse rounded" />
                            ) : (
                                <>
                                    <p className="text-2xl font-bold tracking-tight">{value?.toLocaleString('vi-VN') ?? '0'}</p>
                                    {hasStatusDot && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.2, type: "spring" }}
                                        >
                                            <Circle className="h-2 w-2 fill-green-500 text-green-500 animate-pulse" />
                                        </motion.div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
                {description && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{description}</p>}
            </div>
        </motion.div>
    );
};

export default StatCard;