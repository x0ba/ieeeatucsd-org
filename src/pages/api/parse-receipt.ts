import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "Missing image URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get OpenRouter API key from environment
    const apiKey = import.meta.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error("OPENROUTER_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Prepare the prompt for receipt parsing
    const systemPrompt = `You are a receipt parsing assistant. Extract information from receipt images and return ONLY valid JSON with no additional text or markdown formatting.

Required JSON structure:
{
  "vendorName": "Business Name",
  "location": "Full Address",
  "dateOfPurchase": "YYYY-MM-DD",
  "lineItems": [
    {
      "description": "Item description",
      "category": "Category",
      "amount": 0.00
    }
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "tip": 0.00,
  "shipping": 0.00,
  "total": 0.00
}

Categories must be one of: Food & Beverages, Transportation, Materials & Supplies, Registration Fees, Equipment, Software/Subscriptions, Printing/Marketing, Other

Rules:
- Return ONLY the JSON object, no markdown code blocks
- All amounts must be numbers (not strings)
- Date must be in YYYY-MM-DD format
- If a field is not found, use empty string for text or 0 for numbers
- Subtotal should be the sum of line items before tax
- Total should be subtotal + tax + tip + shipping`;

    const userPrompt = `Please analyze this receipt image and extract all information according to the JSON schema provided.`;

    // Call OpenRouter API
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ieeeucsd.org",
          "X-Title": "IEEE UCSD Reimbursement System",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: userPrompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 2000,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", errorText);
      return new Response(
        JSON.stringify({
          error: "Failed to parse receipt with AI",
          details: errorText,
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const data = await response.json();

    // Extract the parsed content
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No content returned from AI" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Parse the JSON response
    let parsedData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({
          error: "Invalid JSON response from AI",
          rawContent: content,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Validate and normalize the parsed data
    // Only vendorName, dateOfPurchase, and lineItems are truly required
    const normalizedData = {
      vendorName: parsedData.vendorName || "Unknown Vendor",
      location: parsedData.location || "",
      dateOfPurchase:
        parsedData.dateOfPurchase || new Date().toISOString().split("T")[0],
      lineItems: Array.isArray(parsedData.lineItems)
        ? parsedData.lineItems
        : [],
      subtotal: parsedData.subtotal || 0,
      tax: parsedData.tax || 0,
      tip: parsedData.tip || 0,
      shipping: parsedData.shipping || 0,
      total: parsedData.total || 0,
    };

    // Validate critical fields
    if (
      !normalizedData.vendorName ||
      normalizedData.vendorName === "Unknown Vendor"
    ) {
      console.warn("Missing vendor name in parsed data");
    }

    if (!normalizedData.lineItems || normalizedData.lineItems.length === 0) {
      console.warn("No line items found in parsed data");
      // Create a default line item with the total
      normalizedData.lineItems = [
        {
          description: "Receipt Total",
          category: "Other",
          amount: normalizedData.total,
        },
      ];
    }

    // Ensure line items have required fields
    normalizedData.lineItems = normalizedData.lineItems.map(
      (item: any, index: number) => ({
        description: item.description || `Item ${index + 1}`,
        category: item.category || "Other",
        amount: parseFloat(item.amount) || 0,
      }),
    );

    // Return the parsed data
    return new Response(
      JSON.stringify({
        success: true,
        data: normalizedData,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in parse-receipt API:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
