"use server";

// Compatibility shim for stale dev/HMR references.
// Kept intentionally broad so old bundles can still resolve the module path
// while the app is being recompiled after production-flow changes.
export * from "@/app/_actions/production";
export * from "@/app/_actions/production-phase";
export * from "@/app/_actions/production-processes";
export * from "@/app/_actions/production-formulas";
