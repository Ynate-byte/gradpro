import React, { useState, useEffect } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBoardData, moveTask } from '@/api/kanbanService';
import { KanbanColumn } from './KanbanColumn';
import { KanbanTask } from './KanbanTask';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
// import { createPortal } from 'react-dom'; // <-- [SỬA LỖI] Gỡ bỏ createPortal
import { TaskDialog } from './TaskDialog';

export function KanbanBoard({ nhomId }) {
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
        queryKey: ['kanbanBoard', nhomId],
        queryFn: () => getBoardData(nhomId),
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
            queryClient.setQueryData(['kanbanBoard', nhomId], variables.previousBoardData);
        },
        onSettled: () => {
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

    function handleDragStart(event) {
        if (event.active.data.current?.type === 'Task') {
            setActiveTask(event.active.data.current.task);
        }
    }

    function handleDragEnd(event) {
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
        
        const previousBoardData = queryClient.getQueryData(['kanbanBoard', nhomId]);

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
    }

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
                <div className="kanban-board-container">
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
                
                {/* ===== [SỬA LỖI TẠI ĐÂY] ===== */}
                {/* Gỡ bỏ createPortal và thêm lại className 'is-overlay' */}
                <DragOverlay>
                    {activeTask && <KanbanTask task={activeTask} className="is-overlay" />}
                </DragOverlay>
                {/* ============================= */}

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