// Optional Swagger decorators - will be available after npm install
// This file provides type-safe wrappers that work even without @nestjs/swagger installed

// Type definitions
type ClassDecorator = <TFunction extends Function>(target: TFunction) => TFunction | void;
type PropertyDecorator = (target: any, propertyKey: string | symbol) => void;
type MethodDecorator = <T>(target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T> | void;

// Try to load Swagger, fallback to no-op decorators if not installed
let swaggerModule: any = null;
try {
  swaggerModule = require('@nestjs/swagger');
} catch (e) {
  // Swagger not installed - will use no-op decorators
}

// Helper functions to create no-op decorators
function createNoOpClassDecorator(): ClassDecorator {
  return function <TFunction extends Function>(target: TFunction): TFunction | void {
    return target;
  };
}

function createNoOpMethodDecorator(): MethodDecorator {
  return function <T>(target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T> | void {
    return descriptor;
  };
}

function createNoOpPropertyDecorator(): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol): void {
    // No-op
  };
}

// Export decorators - use real ones if available, otherwise no-op
export const ApiTags: (name?: string) => ClassDecorator = swaggerModule?.ApiTags || ((name?: string) => createNoOpClassDecorator());

export const ApiOperation: (options?: any) => MethodDecorator = swaggerModule?.ApiOperation || ((options?: any) => createNoOpMethodDecorator());

export const ApiResponse: (options?: any) => MethodDecorator = swaggerModule?.ApiResponse || ((options?: any) => createNoOpMethodDecorator());

export const ApiBearerAuth: (name?: string) => any = swaggerModule?.ApiBearerAuth || ((name?: string) => {
  return function (target: any, propertyKey?: string | symbol, descriptor?: any): any {
    if (descriptor) return descriptor;
    return target;
  };
});

export const ApiProperty: (options?: any) => PropertyDecorator = swaggerModule?.ApiProperty || ((options?: any) => createNoOpPropertyDecorator());

export const ApiPropertyOptional: (options?: any) => PropertyDecorator = swaggerModule?.ApiPropertyOptional || ((options?: any) => createNoOpPropertyDecorator());

// ApiParam and ApiQuery in NestJS Swagger are MethodDecorators (applied above methods), not ParameterDecorators
export const ApiParam: (options?: any) => MethodDecorator = swaggerModule?.ApiParam || ((options?: any) => createNoOpMethodDecorator());

export const ApiQuery: (options?: any) => MethodDecorator = swaggerModule?.ApiQuery || ((options?: any) => createNoOpMethodDecorator());
