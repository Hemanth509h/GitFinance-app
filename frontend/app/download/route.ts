import { NextResponse } from "next/server";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";

export async function GET() {
  const apkPath = join(process.cwd(), "public", "gig-finances.apk");

  try {
    await access(apkPath);
    const file = await readFile(apkPath);

    return new NextResponse(file, {
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition":
          'attachment; filename="GigFinances-v1.0.0.apk"',
        "Content-Length": String(file.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "APK not found. Place the release APK at frontend/public/gig-finances.apk",
      },
      { status: 404 },
    );
  }
}
