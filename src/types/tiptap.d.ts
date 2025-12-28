import '@tiptap/core';

declare module '@tiptap/core' {
  interface EditorEvents {
    taskEdit: { taskId: string };
    createNewTask: { insertionPos?: number } | undefined;
    convertLineToTask: { content: string };
    deleteTask: { taskId: string };
  }

  interface Commands<ReturnType> {
    taskWidget: {
        insertTaskWidget: (taskId: string, initialContent?: string, initialCompleted?: boolean, autoFocus?: boolean) => ReturnType;
        updateTaskWidget: (taskId: string, newTaskId?: string) => ReturnType;
    };
  }
}
