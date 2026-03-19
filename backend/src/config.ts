import dotenv from "dotenv";

dotenv.config();

export interface Config {
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  server: {
    port: number;
  };
  ai: {
    defaultModel: string;
  };
}

export const config: Config = {
  database: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD ?? "password",
    database: process.env.DB_NAME || "ai_assistant",
  },
  server: {
    port: Number(process.env.PORT || "3000"),
  },
  ai: {
    defaultModel: "gpt-4o",
  },
};
