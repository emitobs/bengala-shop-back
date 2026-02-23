import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { OptionalAuthGuard } from '../../common/guards/optional-auth.guard';
import { AssistantService } from './assistant.service';
import { ChatRequestDto } from './dto/chat.dto';
import { ChatFeedbackDto } from './dto/feedback.dto';

@Controller('assistant')
export class AssistantController {
  constructor(private assistantService: AssistantService) {}

  @Public()
  @UseGuards(OptionalAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('chat')
  async chat(@Body() dto: ChatRequestDto, @Req() req: any) {
    const userId = req.user?.id ?? undefined;
    return this.assistantService.chat(
      dto.messages,
      userId,
      dto.conversationId,
    );
  }

  @Public()
  @Post('feedback')
  async feedback(@Body() dto: ChatFeedbackDto) {
    await this.assistantService.submitFeedback(dto.messageId, dto.feedback);
    return { ok: true };
  }
}
