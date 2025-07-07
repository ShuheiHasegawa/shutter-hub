import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // 開発環境でのみ動作
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    const { email } = await request.json();

    // 入力検証
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // MCPを使ってユーザーを削除
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    // Supabase Admin APIを使用してユーザーを削除
    const deleteUserResponse = await fetch(
      `${supabaseUrl}/auth/v1/admin/users`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!deleteUserResponse.ok) {
      throw new Error(
        `Failed to fetch users: ${deleteUserResponse.statusText}`
      );
    }

    const usersData = await deleteUserResponse.json();
    const userToDelete = usersData.users?.find(
      (user: { email: string; id: string }) => user.email === email
    );

    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ユーザーを削除
    const deleteResponse = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${userToDelete.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      }
    );

    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete user: ${deleteResponse.statusText}`);
    }

    return NextResponse.json({
      success: true,
      message: `User ${email} deleted successfully`,
      userId: userToDelete.id,
    });
  } catch (error) {
    console.error('Delete user API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
