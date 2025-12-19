// API Route: /api/health

export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'KVB Live Monitor',
    api: 'VRR EFA'
  });
}
