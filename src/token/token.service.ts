import { HttpService } from '@nestjs/axios';
import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  InternalServerErrorException,
  Scope,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AxiosRequestConfig } from 'axios';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import { httpCatchAxiosError } from '../common/http/http.catch-axios-error';
import { TokenEntity } from './entities/token.entity';
import { REQUEST } from '@nestjs/core';

@Injectable({ scope: Scope.REQUEST }) // Ensure request scope
export class TokenService {
  private readonly baseURL: string = 'https://open.spotify.com';

  private readonly headers: AxiosRequestConfig['headers'] = {
    Accept: 'application/json',
    'App-Platform': 'WebPlayer',
    Cookie: (this.request as any)['SPOTIFY_COOKIE'], //(global as any).SPOTIFY_COOKIE, //this.dynamicConfigService.getSpotifyCookie(), //process.env.SPOTIFY_COOKIE, //this.configService.get<string>('app.spotifyCookie'),
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject(REQUEST) private readonly request: Request,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async create() {
    console.log('headers: ', this.headers);
    const request$ = this.httpService
      .get<TokenEntity>('/get_access_token', {
        baseURL: this.baseURL,
        headers: this.headers,
        params: { reason: 'transport', productType: 'web_player' },
      })
      .pipe(
        httpCatchAxiosError({
          defaultStatusText:
            'Failed to retrieve Spotify internal token, please check your SPOTIFY_COOKIE environment',
        }),
      );

    const { data: token } = await firstValueFrom(request$);

    if (token.isAnonymous === true) {
      throw new InternalServerErrorException(
        'Your token is treated as anonymous, please check your SPOTIFY_COOKIE environment.',
        {
          description: 'SPOTIFY_COOKIE_INVALID',
        },
      );
    }

    return new TokenEntity(token);
  }

  async findOneOrCreate() {
    const key = 'access_token';
    const cached = await this.cacheManager.get<TokenEntity>(key);

    // dont use cached
    // if (cached !== undefined) {
    //   return cached;
    // }

    const token = await this.create();
    // await this.cacheManager.set(
    //   key,
    //   token,
    //   // Make sure the cached token is expired 5s faster before its actual expired time
    //   token.accessTokenExpirationTimestampMs - 5000 - new Date().getTime(),
    // );

    return token;
  }
}
