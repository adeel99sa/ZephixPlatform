import { Injectable, Logger, OnModuleInit, Type } from '@nestjs/common';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { match } from 'path-to-regexp';
import {
  AUDIT_GUARD_DECISION_METADATA_KEY,
  AuditGuardDecisionMetadata,
  NEST_HTTP_GLOBAL_PREFIX,
} from './guard-audit.constants';

function addLeadingSlash(route: string): string {
  if (!route?.length) return '';
  return route.startsWith('/') ? route : `/${route}`;
}

function joinHttpRoute(
  globalPrefix: string,
  controllerPath: string,
  methodPath: string,
): string {
  const gp = globalPrefix.replace(/^\/+|\/+$/g, '');
  const cp = controllerPath.replace(/^\/+|\/+$/g, '');
  const mp = methodPath.replace(/^\/+|\/+$/g, '');
  const parts = [gp, cp, mp].filter((p) => p.length > 0);
  return `/${parts.join('/')}`;
}

function httpMethodToNestEnum(method: string): RequestMethod | undefined {
  const upper = method.toUpperCase();
  const map: Record<string, RequestMethod> = {
    GET: RequestMethod.GET,
    POST: RequestMethod.POST,
    PUT: RequestMethod.PUT,
    PATCH: RequestMethod.PATCH,
    DELETE: RequestMethod.DELETE,
    OPTIONS: RequestMethod.OPTIONS,
    HEAD: RequestMethod.HEAD,
    ALL: RequestMethod.ALL,
  };
  return map[upper];
}

interface RegisteredGuardAuditRoute {
  nestMethod: RequestMethod;
  matcher: ReturnType<typeof match>;
  meta: AuditGuardDecisionMetadata;
}

/**
 * Maps HTTP requests to {@link AuditGuardDecisionMetadata} for routes decorated at bootstrap.
 * Required for guard-thrown 401/403 because global exception filters do not receive handler refs.
 */
@Injectable()
export class GuardAuditRouteRegistry implements OnModuleInit {
  private readonly logger = new Logger(GuardAuditRouteRegistry.name);
  private routes: RegisteredGuardAuditRoute[] = [];

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  onModuleInit(): void {
    const discovered: RegisteredGuardAuditRoute[] = [];
    for (const wrapper of this.discovery.getControllers()) {
      const { instance, metatype } = wrapper;
      if (!instance || !metatype || typeof metatype !== 'function') continue;

      const prototype = Object.getPrototypeOf(instance);
      if (!prototype) continue;

      const controllerPaths = this.controllerBasePaths(metatype as Type<object>);

      for (const methodName of this.metadataScanner.getAllMethodNames(prototype)) {
        if (methodName === 'constructor') continue;

        const handlerFn = prototype[methodName];
        if (typeof handlerFn !== 'function') continue;

        const routePathMeta = Reflect.getMetadata(PATH_METADATA, handlerFn);
        if (routePathMeta === undefined || routePathMeta === null) continue;

        const methodFlag = Reflect.getMetadata(METHOD_METADATA, handlerFn);
        if (methodFlag === undefined || methodFlag === null) continue;

        const auditMeta = Reflect.getMetadata(
          AUDIT_GUARD_DECISION_METADATA_KEY,
          handlerFn,
        ) as AuditGuardDecisionMetadata | undefined;
        if (!auditMeta) continue;

        const methodFragments = this.methodRouteFragments(routePathMeta);

        for (const ctrlPath of controllerPaths) {
          for (const mFrag of methodFragments) {
            const fullPath = joinHttpRoute(
              NEST_HTTP_GLOBAL_PREFIX,
              ctrlPath,
              mFrag,
            );
            try {
              discovered.push({
                nestMethod: methodFlag as RequestMethod,
                matcher: match(fullPath),
                meta: auditMeta,
              });
            } catch (e) {
              this.logger.warn(
                `Skipping guard-audit route pattern "${fullPath}": ${(e as Error).message}`,
              );
            }
          }
        }
      }
    }

    this.routes = discovered;
    this.logger.log(`Guard-audit route patterns registered: ${this.routes.length}`);
  }

  resolve(
    httpMethod: string,
    pathname: string,
  ): AuditGuardDecisionMetadata | undefined {
    const nestMethod = httpMethodToNestEnum(httpMethod);
    if (nestMethod === undefined) return undefined;

    const pathOnly = pathname.split('?')[0] || '/';

    for (const entry of this.routes) {
      if (entry.nestMethod !== nestMethod) continue;
      const hit = entry.matcher(pathOnly);
      if (hit !== false) return entry.meta;
    }
    return undefined;
  }

  private controllerBasePaths(metatype: Type<object>): string[] {
    const raw = Reflect.getMetadata(PATH_METADATA, metatype);
    if (raw === undefined || raw === null) {
      return [''];
    }
    const paths = Array.isArray(raw) ? raw : [raw];
    return paths.map((p: string) =>
      typeof p === 'string' && p.length ? addLeadingSlash(p).replace(/^\/+|\/+$/g, '') : '',
    );
  }

  private methodRouteFragments(routePathMeta: string | string[]): string[] {
    const paths = Array.isArray(routePathMeta) ? routePathMeta : [routePathMeta];
    return paths.map((p) =>
      typeof p === 'string' && p.length ? addLeadingSlash(p).replace(/^\/+|\/+$/g, '') : '',
    );
  }
}
