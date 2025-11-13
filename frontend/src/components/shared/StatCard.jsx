import React from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";

const StatCard = ({ icon: Icon, title, value, description, iconBgClass, iconColorClass, onClick }) => (
    <motion.div
        className={cn(
            "bg-card text-card-foreground p-4 rounded-lg shadow-sm border flex items-center gap-4 transition-all duration-300",
            onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5"
        )}
        whileHover={onClick ? { y: -2 } : {}}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        onClick={onClick}
        layout
    >
        <motion.div
            className={cn("p-3 rounded-lg", iconBgClass)}
            animate={{
                scale: value === 'loading' ? [1, 1.05, 1] : 1,
            }}
            transition={{
                duration: 1.5,
                repeat: value === 'loading' ? Infinity : 0,
                ease: "easeInOut"
            }}
        >
            <Icon className={cn("h-6 w-6", iconColorClass)} />
        </motion.div>
        <div className="flex-1">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            <div className="flex items-center gap-2 h-8 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={value}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="flex items-center gap-2"
                    >
                        {value === 'loading' ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                            <p className="text-2xl font-bold">{value}</p>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
            {description && (
                <motion.p
                    className="text-xs text-muted-foreground mt-0.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    {description}
                </motion.p>
            )}
        </div>
    </motion.div>
);

export default StatCard;