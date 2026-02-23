import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const IS_API_KEY = 'isApiKey';
export const ApiKeyAuth = () => SetMetadata(IS_API_KEY, true);

export const CurrentBranch = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const branch = request.branch;
    if (!branch) return null;
    return data ? branch[data] : branch;
  },
);
