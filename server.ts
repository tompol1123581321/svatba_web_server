const PORT = parseInt(Deno.env.get("PORT") || "8080");

// Function to save data to Deno KV
async function saveDataToKV(key: string, data: any) {
  const openKvClient = await Deno.openKv();

  const result = await openKvClient.set([key], data);
  if (!result.ok) {
    throw new Error(`Failed to save data to KV`);
  }

  return result;
}

async function readDataFromKV() {
  const openKvClient = await Deno.openKv();
  const iter = openKvClient.list({ prefix: [] });
  const items = [];
  for await (const res of iter) {
    items.push(res);
  }
  return items;
}

const decodeJson = async (reader: ReadableStream<Uint8Array>): Promise<any> => {
  const decoder = new TextDecoder();
  const body = await reader.getReader().read();
  return JSON.parse(decoder.decode(body.value));
};

const handlePostRequest = async (request: Request): Promise<Response> => {
  try {
    if (!request.body) {
      throw new Error("no body");
    }
    const data = await decodeJson(request.body);
    const key = `data-${new Date().toISOString()}`; // Generate a unique key for each entry
    await saveDataToKV(key, data);
    return new Response("Data saved successfully", { status: 200 });
  } catch (error) {
    console.error("Error processing POST request:", error);
    return new Response("Failed to process the request", { status: 500 });
  }
};

const handleGetRequest = async (request: Request): Promise<Response> => {
  try {
    const { headers } = request;
    if (
      headers.get("SECRET_HEADER_KEY") === Deno.env.get("SECRET_HEADER_KEY")
    ) {
      const data = await readDataFromKV();
      return new Response(JSON.stringify(data), { status: 200 });
    } else {
      return new Response("Failed to process the request (Secret)", {
        status: 500,
      });
    }
  } catch (error) {
    console.error("Error processing POST request:", error);
    return new Response("Failed to process the request", { status: 500 });
  }
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Allows all domains
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const handler = async (request: Request): Promise<Response> => {
  // Handling preflight request
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: new Headers(corsHeaders),
    });
  }

  // Ensure CORS headers are included in every response
  const headers = new Headers(corsHeaders);

  if (request.method === "POST" && request.url.includes("/submit_form_data")) {
    const response = await handlePostRequest(request);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  } else if (
    request.method === "GET" &&
    request.url.includes("/read_form_data")
  ) {
    const response = await handleGetRequest(request);
    return response;
  } else {
    return new Response("Not Found", { status: 404, headers });
  }
};

console.log(`HTTP server running. Access it at: http://localhost:${PORT}/`);
await Deno.serve({ port: PORT }, handler);
