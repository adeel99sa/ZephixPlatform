Name
backend-nestjs

Description
Use for NestJS controllers, modules, DI, guards, interceptors, TypeORM integration, and route contracts.

Instructions

Locate the controller path and its @Controller prefix.

Confirm final HTTP path including global prefix /api if present.

For DI fixes in tests, prefer useValue mocks.

Do not change runtime logic unless explicitly required.

Add tests beside existing describe blocks.

Validation

npm run build in zephix-backend

targeted jest testPathPattern for touched spec
