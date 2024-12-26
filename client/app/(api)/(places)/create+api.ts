import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      place_id,
      rating,
      location,
      image,
      name,
      website,
      formatted_address,
      types,
    } = body;
    console.log("Body: ", body);

    if (!place_id || !location || !image) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const sql = neon(`${process.env.DATABASE_URL}`);

    const response = await sql`
        INSERT INTO places ( 
            place_id,
            rating,
            location,
            image,
            name,
            website,
            formatted_address,
            types
        ) VALUES (
            ${place_id},
            ${rating ?? null},
            ${location},
            ${image},
            ${name ?? ""},
            ${website ?? ""},
            ${formatted_address ?? ""},
            ${types ?? ""}
        )
        RETURNING *;
      `;

    return Response.json({ data: response[0] }, { status: 201 });
  } catch (error) {
    console.error("Error inserting data into recent_rides:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
