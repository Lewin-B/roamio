// (api)/(profile)/update+api.ts
import { neon } from "@neondatabase/serverless";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { clerk_id, username, bio, image_url } = body;

    if (!clerk_id) {
      return Response.json({ error: "Missing clerk_id" }, { status: 400 });
    }

    const sql = neon(`${process.env.DATABASE_URL}`);
    const response = await sql`
      UPDATE users 
      SET 
        username = COALESCE(${username}, username),
        bio = COALESCE(${bio}, bio),
        image_url = COALESCE(${image_url}, image_url)
      WHERE clerk_id = ${clerk_id}
      RETURNING *;
    `;

    return Response.json({ data: response[0] });
  } catch (error) {
    console.error("Error updating user:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}