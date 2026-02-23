import { IsIn, IsString } from 'class-validator';

export class ChatFeedbackDto {
  @IsString()
  messageId: string;

  @IsIn([1, -1])
  feedback: number;
}
