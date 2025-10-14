import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware({
  // The following routes are publicly accessible
  publicRoutes: ['/', '/sign-in', '/sign-up'],
});

export const config = {
  // Stop middleware from running on static files
  matcher: ['/((?!.*\\..*|_next).*)', '/']
};