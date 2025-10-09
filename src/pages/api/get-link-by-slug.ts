import type { APIRoute } from "astro";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { app } from "../../firebase/server";

const db = getFirestore(app);

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return new Response(
        JSON.stringify({ error: "Slug parameter is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Query for the link with the matching shortUrl
    const linksQuery = query(
      collection(db, "links"),
      where("shortUrl", "==", slug),
    );

    const querySnapshot = await getDocs(linksQuery);

    if (querySnapshot.empty) {
      return new Response(JSON.stringify({ error: "Link not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const linkDoc = querySnapshot.docs[0];
    const linkData = linkDoc.data();

    // Check publish/expire dates
    const now = Timestamp.now();

    // Check if link is published
    if (
      linkData.publishDate &&
      linkData.publishDate.toMillis() > now.toMillis()
    ) {
      return new Response(JSON.stringify({ error: "Link not yet published" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if link is expired
    if (
      linkData.expireDate &&
      linkData.expireDate.toMillis() < now.toMillis()
    ) {
      return new Response(JSON.stringify({ error: "Link has expired" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return the link data
    return new Response(
      JSON.stringify({
        id: linkDoc.id,
        url: linkData.url,
        title: linkData.title,
        category: linkData.category,
        description: linkData.description,
        iconUrl: linkData.iconUrl,
        shortUrl: linkData.shortUrl,
        publishDate: linkData.publishDate,
        expireDate: linkData.expireDate,
        createdAt: linkData.createdAt,
        createdBy: linkData.createdBy,
        lastModified: linkData.lastModified,
        lastModifiedBy: linkData.lastModifiedBy,
        order: linkData.order,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error fetching link by slug:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
