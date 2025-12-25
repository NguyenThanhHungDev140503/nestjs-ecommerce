import { Global, Module } from '@nestjs/common';
import { NovuService } from './novu.service';
import { PrismaModule } from 'libs/common/database/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [NovuService],
  exports: [NovuService],
})
export class NovuModule {}
