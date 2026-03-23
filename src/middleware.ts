import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Rutas que requieren login obligatorio
const isProtectedRoute = createRouteMatcher([
    '/admin(.*)',
    '/perfil(.*)',
]);

// Rutas de Webhooks (Siempre ignorar)
const isWebhookRoute = createRouteMatcher([
    '/api/webhook(.*)',
    '/api/webhooks/clerk(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
    // 1. Si es webhook, no hagas nada
    if (isWebhookRoute(req)) return;

    // 2. Si es una ruta protegida, verifica la sesión
    if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};