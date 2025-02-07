declare module "bun" {
  interface Env {
    // General
    FRONTEND_URL: string;

    // 42
    FT_CLIENT_ID: string;
    FT_CLIENT_SECRET: string;

    // OpenAI
    OPENAI_API_KEY: string;

    // Resend
    RESEND_API_KEY: string;
  }
}
