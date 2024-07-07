import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const PORT = parseInt(Deno.env.get("PORT") || "8080");

const smtpClient = new SmtpClient();

const setupEmailClient = async () => {
  try {
    console.log(
      Deno.env.get("SMTP_HOST"),
      parseInt(Deno.env.get("SMTP_PORT") || "465"),
      Deno.env.get("SMTP_USERNAME"),
      Deno.env.get("SMTP_PASSWORD")
    );
    await smtpClient.connectTLS({
      hostname: Deno.env.get("SMTP_HOST") ?? "", // SMTP server address as environment variable
      port: parseInt(Deno.env.get("SMTP_PORT") || "465"), // SMTP port as environment variable, defaulting to 465
      username: Deno.env.get("SMTP_USERNAME"), // SMTP username from environment variable
      password: Deno.env.get("SMTP_PASSWORD"), // SMTP password from environment variable
    });
  } catch (error) {
    console.log(error);
  }
};

const sendEmail = async (data: any) => {
  await smtpClient.send({
    from: "tom.polivka96@gmail.com", // Sender email address
    to: "tom.polivka96@gmail.com", // Recipient email address
    subject: "New Data Submission - svatba - ostrov",
    content: `Received data: ${JSON.stringify(data, null, 2)}`,
    html: `<p>Received data: <pre>${JSON.stringify(data, null, 2)}</pre></p>`, // Optional HTML content
  });
};

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
    await sendEmail(data);
    return new Response("Data saved successfully", { status: 200 });
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
  } else {
    return new Response("Not Found", { status: 404, headers });
  }
};

console.log(`HTTP server running. Access it at: http://localhost:${PORT}/`);
await Deno.serve({ port: PORT }, handler);
await setupEmailClient();
