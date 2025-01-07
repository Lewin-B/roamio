import { neon } from "@neondatabase/serverless";

export async function GET(request: Request, { id }: { id: string }) {
  console.log("id: ", id);
  if (!id)
    return Response.json({ error: "Missing required fields" }, { status: 400 });

  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const response = await sql`
          SELECT 
            users.*,
            'reviews', 
    json_agg(to_jsonb(reviews)) 
        AS reviews
            FROM 
                users
            LEFT JOIN
                reviews ON users.id = reviews.user_id
            WHERE 
                users.clerk_id = ${id}
            GROUP BY
                users.id;
      `;

    console.log("response: ", response);

    return Response.json({ data: response });
  } catch (error) {
    console.error("Error fetching recent rides:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
