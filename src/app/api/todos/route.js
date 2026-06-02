import { connectDB } from '@/lib/db';
import Todo from '@/models/Todo';

// ini GET ALL
export async function GET() {
    await connectDB();  // 1. Connect ke MongoDB
    const todos = await Todo.find(); // 2. Query: SELECT * FROM todos
    return Response.json(todos); // 3. Return JSON ke client
}

export async function POST(req) {
    await connectDB();
    const body = await req.json();
    const newTodo = new Todo(body);
    const saved = await newTodo.save();
    return Response.json(saved, { status: 201 });
}

// Client Request → Next.js Route → Connect DB → Query MongoDB → Return JSON