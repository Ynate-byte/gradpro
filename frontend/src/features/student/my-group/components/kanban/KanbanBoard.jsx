import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
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

// [MODIFIED] Chấp nhận start_date và end_date props
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
        // [MODIFIED] Thêm date vào queryKey để tự động refresh khi đổi tuần
        queryKey: ['kanbanBoard', nhomId, start_date, end_date], 
        // [MODIFIED] Truyền date vào API để lọc tasks theo deadline
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
            setTasks(data.tasks || {});
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
            // [MODIFIED] Sử dụng start_date/end_date trong queryKey cho việc hoàn tác
            queryClient.setQueryData(['kanbanBoard', nhomId, start_date, end_date], variables.previousBoardData); 
        },
        onSettled: () => {
            // Invalidate cả 2 query (board và stats)
            queryClient.invalidateQueries({ queryKey: ['kanbanBoard', nhomId] });
            queryClient.invalidateQueries({ queryKey: ['taskStats', nhomId] });
        }
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    // [FIXED] ĐỊNH NGHĨA HÀM handleDragStart
    const handleDragStart = useCallback((event) => {
        if (event.active.data.current?.type === 'Task') {
            setActiveTask(event.active.data.current.task);
        }
    }, []);

    // [FIXED] ĐỊNH NGHĨA HÀM handleDragEnd
    const handleDragEnd = useCallback((event) => {
        setActiveTask(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const isActiveTask = active.data.current?.type === 'Task';
        if (!isActiveTask) return;

        const sourceColumnId = active.data.current.task.ID_COT;
        let destColumnId;
        if (over.data.current?.type === 'Column') {
            destColumnId = over.id;
        } else if (over.data.current?.type === 'Task') {
            destColumnId = over.data.current.task.ID_COT;
        } else {
            return;
        }
        
        // Lấy dữ liệu board hiện tại trước khi thay đổi (cho undo)
        // [MODIFIED] Sử dụng start_date/end_date trong queryKey
        const previousBoardData = queryClient.getQueryData(['kanbanBoard', nhomId, start_date, end_date]);

        setTasks(prevTasks => {
            const sourceTasks = [...(prevTasks[sourceColumnId] || [])];
            const destTasks = sourceColumnId === destColumnId 
                ? sourceTasks 
                : [...(prevTasks[destColumnId] || [])];

            const taskIndex = sourceTasks.findIndex(t => t.ID_CONGVIEC === active.id);
            if (taskIndex === -1) return prevTasks;
            const [movedTask] = sourceTasks.splice(taskIndex, 1);
            movedTask.ID_COT = destColumnId;

            const overTaskIndex = destTasks.findIndex(t => t.ID_CONGVIEC === over.id);
            let newIndex;
            if (overTaskIndex >= 0) {
                newIndex = overTaskIndex;
                destTasks.splice(newIndex, 0, movedTask);
            } else {
                newIndex = destTasks.length;
                destTasks.push(movedTask);
            }

            moveTaskMutation.mutate({
                taskId: active.id,
                newColumnId: destColumnId,
                newIndex: newIndex,
                siblings: destTasks.slice(newIndex + 1),
                previousBoardData: previousBoardData,
            });

            if (sourceColumnId === destColumnId) {
                return { ...prevTasks, [destColumnId]: destTasks };
            }
            return {
                ...prevTasks,
                [sourceColumnId]: sourceTasks,
                [destColumnId]: destTasks,
            };
        });
    }, [nhomId, start_date, end_date, moveTaskMutation, queryClient]); // [MODIFIED] Thêm dependencies

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
                onDragStart={handleDragStart} 
                onDragEnd={handleDragEnd}
            >
                <div className={cn("kanban-board-container", "flex flex-nowrap")}>
                    <SortableContext items={columns.map(c => c.ID_COT)}>
                        {columns.map(col => (
                            <KanbanColumn
                                key={col.ID_COT}
                                column={col}
                                tasks={tasks[col.ID_COT] || []}
                                onAddTask={(colId) => {
                                    setDialogState({ isOpen: true, task: null, colId: colId });
                                }}
                                onTaskClick={(task) => {
                                    setDialogState({ isOpen: true, task: task, colId: task.ID_COT });
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
            />
        </>
    );
}