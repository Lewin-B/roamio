import { neon } from "@neondatabase/serverless";

export async function GET(request: Request, { id }: { id: string }) {
  if (!id)
    return Response.json({ error: "Missing required fields" }, { status: 400 });

  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const response = await sql`
          SELECT 
    places.*,
    'reviews', 
    json_agg(to_jsonb(reviews)) 
        AS reviews
        FROM 
            places
        LEFT JOIN
            reviews ON places.id = reviews.place_id
        WHERE 
            places.place_id = ${id}
        GROUP BY
            places.id;
      `;

    return Response.json({ data: response });
  } catch (error) {
    console.error("Error fetching recent rides:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
