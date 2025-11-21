import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Loader2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from "@/components/theme-provider";

const StatCard = ({ icon: Icon, title, value, description, iconBgClass = "bg-primary/10", iconColorClass = "text-primary", hasStatusDot, onClick, isLoading }) => {
    const shouldReduceMotion = useReducedMotion();
    const { reduceMotion } = useTheme();
    const isReduced = reduceMotion || shouldReduceMotion;

    return (
        <motion.div 
            className={cn(
                // [SỬA] Thêm h-full để thẻ tự giãn chiều cao bằng nhau
                "bg-card text-card-foreground p-2 rounded-lg shadow-sm border flex items-center gap-4 transition-all duration-300 h-full",
                onClick && "cursor-pointer hover:shadow-md hover:border-primary/50"
            )}
            whileHover={isReduced ? {} : { y: -4, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={onClick}
        >
            <motion.div 
                className={cn("p-3 rounded-lg flex-shrink-0", iconBgClass)}
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
                {Icon && <Icon className={cn("h-6 w-6", iconColorClass)} />}
            </motion.div>
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-muted-foreground truncate">{title}</h3>
                <div className="flex items-baseline gap-2 h-8 overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isLoading ? 'loading' : value}
                            initial={isReduced ? { opacity: 1 } : { opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={isReduced ? { opacity: 0 } : { opacity: 0, y: -15 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="flex items-baseline gap-2"
                        >
                            {value === 'loading' || isLoading ? (
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                            ) : (
                                <>
                                    <p className="text-2xl font-bold">{value?.toLocaleString('vi-VN') ?? '0'}</p>
                                    {hasStatusDot && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.2, type: "spring" }}
                                        >
                                            <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500 animate-pulse" />
                                        </motion.div>
                                    )}
                                </>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
                {description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>}
            </div>
        </motion.div>
    );
};

export default StatCard;