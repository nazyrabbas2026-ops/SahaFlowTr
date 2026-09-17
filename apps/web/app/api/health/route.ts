export async function GET() {
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000"}/api/v1/health/ready`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    return Response.json(await response.json(), { status: response.status });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
