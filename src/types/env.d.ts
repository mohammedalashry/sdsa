// This file provides TypeScript declarations for your environment variables.
// It augments NodeJS.ProcessEnv so that `process.env.NODE_ENV`, `process.env.PORT`, etc. are strongly typed.
import { NodeEnv } from "./src/types/node_env.types";

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The runtime environment. Usually one of:
     * - "development"
     * - "production"
     * - "test"
     */
    NODE_ENV: NodeEnv;

    /**
     * The port on which the server should listen.
     * Optional because you may default to 3080 in code if not provided.
     */
    PORT?: string;

    /**
     * Add here any other environment variables your application uses.
     * For example:
     *
     *   DB_HOST: string;
     *   DB_PORT: string;
     *   DATABASE_URL: string;
     *   JWT_SECRET: string;
     *
     * If you expect a variable to always be present at runtime, leave it non-optional.
     * If it’s truly optional, suffix it with `?`.
     */
    // DB_HOST?: string;
    // DB_PORT?: string;
    HOST?: string;
    DATABASE_URL?: string;
    JWT_SECRET?: string;
    KORASTATS_API_ENDPOINT?: string;
    KORASTATS_API_KEY?: string;
  }
}

// This line tells TypeScript that this is a module, even though it only contains global declarations.
// Without `export {}`, TypeScript might complain “File is a script; rather than a module.” in some configurations.
export {};
