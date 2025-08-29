import { Controller, Get } from '@nestjs/common';

@Controller('diagnostic')
export class DiagnosticController {
  @Get('test')
  test() {
    return { status: 'Diagnostic controller working', timestamp: new Date() };
  }
}
