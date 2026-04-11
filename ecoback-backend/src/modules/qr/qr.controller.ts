import { Controller, Post, Body, Param, Headers } from '@nestjs/common';
import { QrService } from './qr.service';

@Controller('qrs')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Post('redeem')
  async redeem(
    @Body() body: any,
    @Headers('x-user-id') userId: string,
  ) {
    return this.qrService.redeemQRCode(body.qrId, userId, body);
  }
}
