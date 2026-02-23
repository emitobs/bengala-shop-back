# Bengala Max API - NestJS Backend (Standalone)

## Module Pattern
Each feature follows: `module.ts` -> `controller.ts` -> `service.ts` -> `dto/`

```
modules/
  feature/
    feature.module.ts       # NestJS module declaration
    feature.controller.ts   # Route handlers (thin, delegates to service)
    feature.service.ts      # Business logic + Prisma queries
    dto/
      create-feature.dto.ts # Input validation with class-validator
      update-feature.dto.ts
```

## Key Patterns

### Controllers
- Thin controllers -- only parse input, call service, return response
- Use decorators: `@CurrentUser()`, `@Roles()`, `@Public()`
- Standard response envelope: `{ data, meta? }`

### Services
- All business logic lives in services
- Inject `PrismaService` for database access
- Throw `HttpException` subtypes (NotFoundException, BadRequestException, etc.)

### DTOs
- Use `class-validator` decorators for validation
- Use `class-transformer` for type transformation
- Always validate input in controllers via `ValidationPipe`

### Guards
- `JwtAuthGuard` is global -- all routes require auth by default
- Use `@Public()` decorator to make routes public
- Use `@Roles(UserRole.ADMIN)` for admin-only routes

## API Routes
- All routes prefixed with `/api/`
- RESTful naming: `/api/products`, `/api/orders/:id`
- Webhook endpoints: `/api/webhooks/mercadopago`, `/api/webhooks/dlocal`

## Database
- Prisma schema at `./prisma/schema.prisma`
- Use `PrismaService` (injected), never instantiate PrismaClient directly
- Use transactions for multi-table operations
- Money fields: `Decimal` in Prisma -> `number` in DTOs

## Shared Code
- Enums, constants, and types are in `src/shared/`
- Import via relative paths: `../../shared/enums`

## Commands
```bash
npm run dev              # Start API in watch mode
npm run build            # Build for production
npm run start:prod       # Run production build
npm run test             # Run unit tests
npm run db:generate      # Regenerate Prisma client
npm run db:migrate       # Create and run migration
npm run db:push          # Quick push (no migration file)
npm run db:seed          # Seed database with dev data
npm run db:studio        # Open Prisma Studio visual editor
```

## Seed Data
- Admin credentials: admin@bengalamax.uy / admin123
- Includes: categories, products with variants, shipping zones, banners
