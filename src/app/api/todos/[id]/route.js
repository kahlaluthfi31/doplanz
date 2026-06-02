import { connectDB } from '@/lib/db';
import Todo from '@/models/Todo';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

// GET by ID - Get satu todo berdasarkan ID
export async function GET(req, { params }) {
    try {
        await connectDB();
        const { id } = params;

        console.log('GET by ID:', id);

        // Validasi format ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'ID tidak valid' }, { status: 400 });
        }

        const todo = await Todo.findById(id);

        if (!todo) {
            return NextResponse.json({ message: 'Todo tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json(todo);
    } catch (error) {
        console.error('GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Create new todo
export async function POST(req) {
    try {
        await connectDB();
        const body = await req.json();

        console.log('POST Request - Body:', body);

        const todo = new Todo(body);
        const saved = await todo.save();

        console.log('Create Result:', saved);

        return NextResponse.json(saved, { status: 201 });
    } catch (error) {
        console.error('POST Error:', error);
        return NextResponse.json({
            error: error.message,
            details: error.errors
        }, { status: 500 });
    }
}

// PUT - Update seluruh data
export async function PUT(req, { params }) {
    try {
        await connectDB();
        const body = await req.json();
        const { id } = params;

        console.log('PUT Request - ID:', id);
        console.log('Request Body:', body);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'ID tidak valid' }, { status: 400 });
        }

        const updated = await Todo.findByIdAndUpdate(
            id,
            body,
            {
                new: true,
                runValidators: true
            }
        );

        console.log('Update Result:', updated);

        if (!updated) {
            return NextResponse.json({ message: 'Todo tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('PUT Error:', error);
        return NextResponse.json({
            error: error.message,
            details: error.errors
        }, { status: 500 });
    }
}

// PATCH - Update sebagian data
export async function PATCH(req, { params }) {
    try {
        await connectDB();
        const body = await req.json();
        const { id } = params;

        console.log('PATCH Request - ID:', id);
        console.log('Request Body:', body);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'ID tidak valid' }, { status: 400 });
        }

        const updated = await Todo.findByIdAndUpdate(
            id,
            { $set: body },
            {
                new: true,
                runValidators: true
            }
        );

        console.log('Update Result:', updated);

        if (!updated) {
            return NextResponse.json({ message: 'Todo tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('PATCH Error:', error);
        return NextResponse.json({
            error: error.message,
            details: error.errors
        }, { status: 500 });
    }
}

// DELETE - Hapus todo
export async function DELETE(req, { params }) {
    try {
        await connectDB();
        const { id } = params;

        console.log('DELETE Request - ID:', id);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'ID tidak valid' }, { status: 400 });
        }

        const deleted = await Todo.findByIdAndDelete(id);

        if (!deleted) {
            return NextResponse.json({ message: 'Todo tidak ditemukan' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Todo berhasil dihapus' });
    } catch (error) {
        console.error('DELETE Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}