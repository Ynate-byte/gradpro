import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    DndContext, 
    DragOverlay, 
    PointerSensor, 
    useSensor, 
    useSensors,
    closestCorners, // [FIX] Thuật toán va chạm tốt hơn cho cột
    pointerWithin,
    getFirstCollision
} from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBoardData, moveTask } from '@/api/kanbanService';
import { KanbanColumn } from './KanbanColumn';
import { KanbanTask } from './KanbanTask';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TaskDialog } from './TaskDialog';
import { cn } from '@/lib/utils';
import '../kanban/Kanban.css'

export function KanbanBoard({ nhomId, start_date, end_date }) { 
    const queryClient = useQueryClient();
    const [columns, setColumns] = useState([]);
    const [tasks, setTasks] = useState({});
    const [members, setMembers] = useState([]);
    const [activeTask, setActiveTask] = useState(null);
    const [dialogState, setDialogState] = useState({
        isOpen: false,
        task: null,
        colId: null,
    });

    const { data, isLoading } = useQuery({
        queryKey: ['kanbanBoard', nhomId, start_date, end_date], 
        queryFn: () => getBoardData(
            nhomId, 
            { start_date, end_date } 
        ),
        onError: () => { 
            toast.error("Không thể tải dữ liệu bảng công việc.");
        }
    });

    useEffect(() => {
        if (data) {
            setColumns(data.columns || []);
            
            // [FIX QUAN TRỌNG] Ép kiểu ID cột sang String để đồng bộ với dnd-kit
            // Và đảm bảo ID task cũng là string nếu cần (thường dnd-kit cần ID unique dạng string)
            const normalizedTasks = {};
            
            if (data.tasks) {
                Object.keys(data.tasks).forEach(key => {
                    // Ép key (ID_COT) sang string
                    const colIdStr = String(key);
                    normalizedTasks[colIdStr] = data.tasks[key].map(t => ({
                        ...t,
                        ID_CONGVIEC: String(t.ID_CONGVIEC), // [FIX] Ép ID task sang String
                        ID_COT: String(t.ID_COT) // [FIX] Ép ID cột trong task sang String
                    }));
                });
            }
            
            setTasks(normalizedTasks);
            setMembers(data.members || []);
        }
    }, [data]);

    const moveTaskMutation = useMutation({
        mutationFn: ({ taskId, newColumnId, newIndex, siblings }) => {
            return moveTask(taskId, {
                ID_COT_MOI: newColumnId,
                THUTU_MOI: newIndex,
                sibling_task_ids: siblings.map(t => t.ID_CONGVIEC)
            });
        },
        onError: (err, variables) => {
            toast.error("Di chuyển thất bại. Đang hoàn tác.");
            // Hoàn tác dữ liệu cũ
            queryClient.setQueryData(['kanbanBoard', nhomId, start_date, end_date], variables.previousBoardData); 
        },
        onSettled: () => {
             // [FIX] Sử dụng exact: false để invalidate tất cả các query liên quan đến bảng này (bất kể ngày tháng)
            queryClient.invalidateQueries({ queryKey: ['kanbanBoard', nhomId], exact: false });
            queryClient.invalidateQueries({ queryKey: ['taskStats', nhomId] });
        }
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Giữ nguyên để tránh click nhầm thành drag
            },
        })
    );

    // [FIX] Custom Collision Detection để sửa lỗi không kéo được sang cột bên cạnh
    // Thuật toán này ưu tiên con trỏ chuột, giúp việc thả vào cột rỗng dễ dàng hơn
    const customCollisionDetection = useCallback((args) => {
        const pointerCollisions = pointerWithin(args);
        if (pointerCollisions.length > 0) {
            return pointerCollisions;
        }
        return closestCorners(args);
    }, []);

    const handleDragStart = useCallback((event) => {
        if (event.active.data.current?.type === 'Task') {
            setActiveTask(event.active.data.current.task);
        }
    }, []);

    const handleDragEnd = useCallback((event) => {
        setActiveTask(null);
        const { active, over } = event;
        if (!over) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        if (activeId === overId) return;

        // Tìm cột nguồn và cột đích
        const sourceColumnId = String(active.data.current.task.ID_COT);
        let destColumnId;

        if (over.data.current?.type === 'Column') {
            destColumnId = String(over.id);
        } else if (over.data.current?.type === 'Task') {
            destColumnId = String(over.data.current.task.ID_COT);
        } else {
            return;
        }

        // Snapshot dữ liệu cũ
        const previousBoardData = queryClient.getQueryData(['kanbanBoard', nhomId, start_date, end_date]);

        setTasks(prevTasks => {
            const sourceTasks = [...(prevTasks[sourceColumnId] || [])];
            const destTasks = sourceColumnId === destColumnId 
                ? sourceTasks 
                : [...(prevTasks[destColumnId] || [])];

            const taskIndex = sourceTasks.findIndex(t => String(t.ID_CONGVIEC) === activeId);
            if (taskIndex === -1) return prevTasks;

            const [movedTask] = sourceTasks.splice(taskIndex, 1);
            movedTask.ID_COT = destColumnId; // Cập nhật ID cột mới cho task

            let newIndex;
            if (over.data.current?.type === 'Task') {
                const overTaskIndex = destTasks.findIndex(t => String(t.ID_CONGVIEC) === overId);
                const isBelowOverItem = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
                const modifier = isBelowOverItem ? 1 : 0;
                newIndex = overTaskIndex >= 0 ? overTaskIndex + modifier : destTasks.length + 1;
            } else {
                // Nếu thả vào cột (over là Column), thêm vào cuối
                newIndex = destTasks.length;
            }
            
            // Chèn task vào vị trí mới
            destTasks.splice(newIndex, 0, movedTask);

            // Gọi API cập nhật
            moveTaskMutation.mutate({
                taskId: activeId,
                newColumnId: destColumnId,
                newIndex: newIndex,
                siblings: destTasks.slice(newIndex + 1), // Gửi các task phía sau để cập nhật thứ tự
                previousBoardData: previousBoardData,
            });

            return {
                ...prevTasks,
                [sourceColumnId]: sourceTasks,
                [destColumnId]: destTasks,
            };
        });
    }, [nhomId, start_date, end_date, moveTaskMutation, queryClient]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Đang tải bảng công việc...</p>
            </div>
        );
    }

    return (
        <>
            <DndContext  
                sensors={sensors} 
                collisionDetection={customCollisionDetection} // [FIX] Sử dụng thuật toán va chạm tùy chỉnh
                onDragStart={handleDragStart} 
                onDragEnd={handleDragEnd}
            >
                <div className={cn("kanban-board-container", "flex flex-nowrap")}>
                    <SortableContext items={columns.map(c => String(c.ID_COT))}>
                        {columns.map(col => (
                            <KanbanColumn
                                key={col.ID_COT}
                                column={col}
                                // [FIX] Đảm bảo ID cột là String khi truy xuất tasks
                                tasks={tasks[String(col.ID_COT)] || []}
                                onAddTask={(colId) => {
                                    setDialogState({ isOpen: true, task: null, colId: String(colId) });
                                }}
                                onTaskClick={(task) => {
                                    setDialogState({ isOpen: true, task: task, colId: String(task.ID_COT) });
                                }}
                            />
                        ))}
                    </SortableContext>
                </div>
                
                <DragOverlay>
                    {activeTask && <KanbanTask task={activeTask} className="is-overlay" />}
                </DragOverlay>

            </DndContext>

            <TaskDialog
                state={dialogState}
                setState={setDialogState}
                nhomId={nhomId}
                members={members}
                columns={columns}
                onSuccess={() => {
                     queryClient.invalidateQueries({ queryKey: ['kanbanBoard', nhomId], exact: false });
                     queryClient.invalidateQueries({ queryKey: ['taskStats', nhomId] });
                }}
            />
        </>
    );
}