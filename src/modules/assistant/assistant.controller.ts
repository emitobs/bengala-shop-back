import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { OptionalAuthGuard } from '../../common/guards/optional-auth.guard';
import { AssistantService } from './assistant.service';
import { ChatRequestDto } from './dto/chat.dto';
import { ChatFeedbackDto } from './dto/feedback.dto';

@Controller('assistant')
export class AssistantController {
  private readonly logger = new Logger(AssistantController.name);

  constructor(private assistantService: AssistantService) {}

  @Public()
  @UseGuards(OptionalAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('chat')
  async chat(@Body() dto: ChatRequestDto, @Req() req: any) {
    try {
      const userId = req.user?.id ?? undefined;
      return await this.assistantService.chat(
        dto.messages,
        userId,
        dto.conversationId,
      );
    } catch (error) {
      const err = error as Error & { status?: number; code?: string };
      this.logger.error(
        `Chat endpoint error: ${err.message}`,
        err.stack,
      );

      // Return a structured error so frontend can log details
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Assistant error: ${err.message ?? 'Unknown error'}`,
          errorCode: err.code ?? 'UNKNOWN',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Public()
  @Post('feedback')
  async feedback(@Body() dto: ChatFeedbackDto) {
    await this.assistantService.submitFeedback(dto.messageId, dto.feedback);
    return { ok: true };
  }
}
