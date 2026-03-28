/**
 * POST /compute takes no body. This empty DTO exists so the ValidationPipe
 * (whitelist + forbidNonWhitelisted) does not reject the request.
 */
export class ComputeKpisDto {}
