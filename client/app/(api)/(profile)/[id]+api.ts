import { neon } from "@neondatabase/serverless";

export async function GET(request: Request, { id }: { id: string }) {
  console.log("id: ", id);
  if (!id)
    return Response.json({ error: "Missing required fields" }, { status: 400 });

  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const response = await sql`
      WITH user_connections AS (
    SELECT 
        users.*,
        COALESCE(json_agg(DISTINCT reviews) FILTER (WHERE reviews.id IS NOT NULL), '[]') AS reviews,
        COALESCE(
            json_agg(
                DISTINCT jsonb_build_object(
                    'id', follower_users.id,
                    'username', follower_users.username,
                    'email', follower_users.email,
                    'image_url', follower_users.image_url,
                    'reviews', (
                        SELECT COALESCE(json_agg(r), '[]')
                        FROM reviews r
                        WHERE r.user_id = follower_users.id
                    )
                )
            ) FILTER (WHERE follower_users.id IS NOT NULL), 
            '[]'
        ) AS followers,
        COALESCE(
            json_agg(
                DISTINCT jsonb_build_object(
                    'id', following_users.id,
                    'username', following_users.username,
                    'email', following_users.email,
                    'image_url', following_users.image_url,
                    'reviews', (
                        SELECT COALESCE(json_agg(r), '[]')
                        FROM reviews r
                        WHERE r.user_id = following_users.id
                    )
                )
            ) FILTER (WHERE following_users.id IS NOT NULL), 
            '[]'
        ) AS following
        FROM 
            users
        LEFT JOIN 
            reviews ON users.id = reviews.user_id
        LEFT JOIN 
            followers AS followers_rel ON users.id = followers_rel.followee
        LEFT JOIN 
            users AS follower_users ON followers_rel.follower = follower_users.id
        LEFT JOIN 
            followers AS following_rel ON users.id = following_rel.follower
        LEFT JOIN 
            users AS following_users ON following_rel.followee = following_users.id
        WHERE 
            users.clerk_id = ${id}
        GROUP BY 
            users.id
)
SELECT * FROM user_connections;
      `;

    console.log("response: ", response);

    return Response.json({ data: response });
  } catch (error) {
    console.error("Error fetching recent rides:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
