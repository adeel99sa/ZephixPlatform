const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');

async function inspectRoutes() {
  try {
    console.log('🔍 Inspecting actual registered routes...');
    const app = await NestFactory.create(AppModule);
    const server = app.getHttpServer();
    const router = server._events.request._router;
    
    if (router && router.stack) {
      const routes = router.stack
        .filter(layer => layer.route)
        .map(layer => ({
          path: layer.route.path,
          methods: Object.keys(layer.route.methods)
        }));
      
      console.log(`\n✅ Actual registered routes: ${routes.length}`);
      console.log('📋 Route details:');
      routes.forEach((route, index) => {
        console.log(`${index + 1}. ${route.methods.join(',')} ${route.path}`);
      });
    } else {
      console.log('❌ No router found or empty stack');
    }
    
    await app.close();
  } catch (error) {
    console.error('❌ Error inspecting routes:', error.message);
  }
}

inspectRoutes();
