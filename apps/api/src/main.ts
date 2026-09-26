import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { RUNTIME_CONFIG, type RuntimeConfig } from "./config.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get<RuntimeConfig>(RUNTIME_CONFIG);
  app.enableShutdownHooks();
  app.enableCors({ origin: config.webOrigin, credentials: true });
  app.use((request: { path: string }, response: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    if (request.path.startsWith("/api/v1/auth/")) response.setHeader("Cache-Control", "no-store");
    next();
  });
  app.setGlobalPrefix("api/v1");

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle("Sense Studios foundation API").setVersion("s01").build()
  );
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(config.port, "0.0.0.0");
}

void bootstrap();
