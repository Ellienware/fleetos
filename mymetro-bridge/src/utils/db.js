import { Client, Databases } from 'node-appwrite';

export function createDB() {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  return new Databases(client);
}

export function success(res, data, status = 200) {
  return res.json({ success: true, data }, status);
}

export function error(res, message, status = 400) {
  return res.json({ success: false, error: message }, status);
}

export function notFound(res, message = 'Not found') {
  return res.json({ success: false, error: message }, 404);
}

export function unauthorized(res, message = 'Unauthorized') {
  return res.json({ success: false, error: message }, 401);
}