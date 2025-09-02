import 'reflect-metadata';

function TestDecorator(name: string) {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata('custom:name', name, target, propertyKey);
  };
}

class TestClass {
  @TestDecorator('test_name')
  testProperty: string;
}

console.log(
  Reflect.getMetadata('custom:name', TestClass.prototype, 'testProperty'),
);
