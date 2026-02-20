// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Definimos qué rutas son protegidas (en este caso, todo lo que empiece con /admin)
const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware(async (auth, req) => {
    if (isAdminRoute(req)) await auth.protect();
});

export const config = {
    matcher: [
        // Ignora los archivos internos de Next.js y archivos estáticos
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Siempre ejecuta para las rutas de la API
        '/(api|trpc)(.*)',
    ],
};