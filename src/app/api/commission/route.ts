import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { projectType, budget, timeline, name, email, message } = body;

    /* Validate required fields */
    if (!projectType || !budget || !timeline) {
      return NextResponse.json(
        { success: false, error: "All selection fields are required." },
        { status: 400 }
      );
    }

    /* In production, this would send an email, save to CRM, etc.
       For now, we log the enquiry and return success. */
    console.log(
      "[VerisVisuals Commission]",
      JSON.stringify(
        { projectType, budget, timeline, name, email, message },
        null,
        2
      )
    );

    return NextResponse.json({
      success: true,
      message: "Your commission has been received.",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request." },
      { status: 400 }
    );
  }
}