import { Module, forwardRef } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { ActivityModule } from '../activity/activity.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: {
        // @ts-expect-error env var allows human-readable duration strings
        expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
      },
    }),
    forwardRef(() => UsersModule),
    ActivityModule,
    forwardRef(() => MessagesModule),
  ],
  providers: [WebsocketGateway, WebsocketService],
  exports: [WebsocketService],
})
export class WebsocketModule {}
