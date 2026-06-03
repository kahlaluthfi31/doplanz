import TasksContent from './TasksContent';

export default async function TasksPage({ searchParams }) {
    const params = await searchParams;
    const filter = params?.filter || 'all';
    const period = params?.period || 'week';

    return <TasksContent filter={filter} period={period} />;
}
