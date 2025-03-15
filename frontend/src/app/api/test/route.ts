import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'API is working', 
    time: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  try {
    // Try to parse any form data if sent
    const formData = await request.formData().catch(() => null);
    const jsonData = formData ? Object.fromEntries(formData.entries()) : null;
    
    return NextResponse.json({
      message: 'POST route is working',
      receivedData: jsonData || 'No data received',
      time: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Error in POST handler', 
      details: error.message 
    }, { status: 500 });
  }
} 