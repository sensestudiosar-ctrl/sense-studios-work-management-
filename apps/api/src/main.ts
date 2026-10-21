import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";
import express from "express";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get<RuntimeConfig>(RUNTIME_CONFIG);
  // Only enable behind the private production proxy, which overwrites forwarded identity.
  app.getHttpAdapter().getInstance().set("trust proxy", config.trustProxyHops || false);
  app.enableShutdownHooks();
  app.enableCors({ origin: config.webOrigin, credentials: true });
  // Only the bounded image-derivative JSON route receives the larger body limit.
  app.use("/api/v1/portfolio/projects", express.json({ limit: "12mb" }));
  app.use("/api/v1/workforce/attendance/check-in", express.json({ limit: "6mb" }));
  app.use(express.json({ limit: "1mb" }));
  app.use((request: { path: string }, response: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    if (request.path.startsWith("/api/")) response.setHeader("Cache-Control", "no-store");
    next();
  });
  app.setGlobalPrefix("api/v1");

  if (config.nodeEnv !== "production") {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle("Sense Studios foundation API").setVersion("s01").build()
    );
    SwaggerModule.setup("api/docs", app, document);
  }

  await app.listen(config.port, config.apiListenHost ?? "0.0.0.0");
}

void bootstrap();
