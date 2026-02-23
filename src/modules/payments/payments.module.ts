import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { DLocalProvider } from './providers/dlocal.provider';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [HttpModule, SettingsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MercadoPagoProvider, DLocalProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
