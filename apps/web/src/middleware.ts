import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // The middleware runs for all routes. We only apply protection
  // to the protected routes.
  if (isProtectedRoute(req)) {
    // auth.protect() will redirect unauthenticated users to the sign-in page
    // and throw a 401 error for API requests.
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
