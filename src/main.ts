import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/https';
import { AppModule } from './app.module';

admin.initializeApp();

const server = express();

// const createSwaggerDocument = ({
//   app,
//   port,
// }: {
//   app: NestExpressApplication;
//   port: number;
// }) => {
//   const config = new DocumentBuilder()
//     .setTitle('Lyricstify API')
//     .setDescription('Discover time-synced Spotify song lyrics.')
//     .setExternalDoc('GitHub Repository', 'https://github.com/lyricstify/api')
//     .setVersion('1.0')
//     .addServer(
//       'https://api.lyricstify.vercel.app/',
//       'Production server Lyricstify API.',
//     )
//     .addServer(
//       `http://localhost:${port}`,
//       'Local server Lyricstify API for development.',
//     )
//     .addTag('lyrics')
//     .build();

//   const options: SwaggerDocumentOptions = {
//     operationIdFactory: (controllerKey, methodKey) => methodKey,
//   };

//   return SwaggerModule.createDocument(app, config, options);
// };

async function createNestServer(expressInstance: express.Express) {
  console.log('Creating Lyricstify Nest Server');

  const app = await NestFactory.create(
    AppModule.register(),
    new ExpressAdapter(expressInstance),
  );

  app.use(
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      // console.log('req query: ', req.query);
      const queryParam = req.query['spotify_cookie'];
      // console.log('Setting SPOTIFY_COOKIE from query param', queryParam);
      if (queryParam) {
        // const decodedParam = Buffer.from(
        //   queryParam as string,
        //   'base64',
        // ).toString('utf-8');
        // console.log('Setting SPOTIFY_COOKIE from query param', decodedParam);

        (req as any).SPOTIFY_COOKIE = (queryParam as string)?.trim();
      }
      next();
    },
  );

  // const configService = app.get(ConfigService);
  // const port = configService.get<number>('app.port') || 3000;
  // const env = configService.get<`${ConfigEnvironment}`>('app.env');

  // app.use(helmet());
  // app.enableVersioning({ type: VersioningType.URI });

  await app.init();

  return app;
}

createNestServer(server)
  .then(() => Logger.log('Lyricstify Nest listening.'))
  .catch((err) => Logger.error('Lyricstify Nest Error', err));

export const lyricstify = onRequest(
  {
    maxInstances: 1,
  },
  server,
);
