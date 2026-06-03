import { Suspense } from 'react';
import TasksContent from './TasksContent';

function TasksFallback() {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-white dark:bg-slate-950">
            <div className="rounded-2xl border border-indigo-100 bg-white p-6 text-center text-xs font-semibold text-indigo-400 shadow-sm animate-pulse">
                Memuat halaman...
            </div>
        </div>
    );
}

export default function TasksPage() {
    return (
        <Suspense fallback={<TasksFallback />}>
            <TasksContent />
        </Suspense>
    );
}
