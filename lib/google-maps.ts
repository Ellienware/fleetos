export async function generatePolylineWithGoogle(waypoints: { lat: number; lng: number }[]) {
  if (waypoints.length < 2) throw new Error('At least origin and destination required');
  
  const origin = `${waypoints[0].lat},${waypoints[0].lng}`;
  const destination = `${waypoints[waypoints.length-1].lat},${waypoints[waypoints.length-1].lng}`;
  const waypointsStr = waypoints.slice(1, -1).map(wp => `${wp.lat},${wp.lng}`).join('|');
  
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=${waypointsStr}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  
  const res = await fetch(url);
  const data = await res.json();
  
  if (!data.routes?.[0]) {
    throw new Error('No route found: ' + (data.error_message || 'Unknown error'));
  }
  
  const polyline = data.routes[0].overview_polyline.points;
  const distance = data.routes[0].legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0) / 1000; // km
  
  return { polyline, distance };
}