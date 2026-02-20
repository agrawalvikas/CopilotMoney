
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001',
});

/**
 * A reusable SWR fetcher that automatically includes the Clerk authentication token.
 * @param url The API endpoint to fetch.
 * @param getToken The `getToken` function from Clerk's `useAuth` hook.
 * @returns The JSON response data.
 */
export const authedFetcher = async (url: string, getToken: () => Promise<string | null>) => {
  const token = await getToken();
  if (!token) {
    throw new Error('User not authenticated');
  }
  const response = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
  return response.data;
};
