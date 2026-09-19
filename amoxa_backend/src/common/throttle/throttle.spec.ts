import { HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottleDecorator } from '@common-throttle/throttle.decorator.js';
import { ThrottleGuard } from '@common-throttle/throttle.guard.js';
import { ThrottleStore } from '@common-throttle/throttle-store.js';
import { FakeExecutionContext } from '@testing-fakes/fake-execution-context.js';

class ThrottledSample {
  @ThrottleDecorator.of({ limit: 2, windowMs: 1000 })
  public limitada(): void {}

  public libre(): void {}
}

describe('ThrottleStore', () => {
  it('permite hasta el límite dentro de la ventana y bloquea el resto', () => {
    const store = new ThrottleStore();

    expect(store.hit('a', 2, 1000, 0)).toBe(true);
    expect(store.hit('a', 2, 1000, 10)).toBe(true);
    expect(store.hit('a', 2, 1000, 20)).toBe(false);
  });

  it('reinicia el conteo cuando la ventana termina', () => {
    const store = new ThrottleStore();
    store.hit('a', 1, 1000, 0);

    expect(store.hit('a', 1, 1000, 500)).toBe(false);
    expect(store.hit('a', 1, 1000, 1500)).toBe(true);
  });

  it('cuenta cada clave por separado', () => {
    const store = new ThrottleStore();
    store.hit('a', 1, 1000, 0);

    expect(store.hit('b', 1, 1000, 0)).toBe(true);
  });
});

describe('ThrottleGuard', () => {
  const context = (handler: () => void) =>
    FakeExecutionContext.forUser(undefined, handler, ThrottledSample).context;

  it('responde 429 al superar el límite de la ruta', () => {
    const guard = new ThrottleGuard(new Reflector(), new ThrottleStore());
    const handler = ThrottledSample.prototype.limitada;

    expect(guard.canActivate(context(handler))).toBe(true);
    expect(guard.canActivate(context(handler))).toBe(true);
    try {
      guard.canActivate(context(handler));
      throw new Error('no debía permitir la tercera petición');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('no limita las rutas sin configuración', () => {
    const guard = new ThrottleGuard(new Reflector(), new ThrottleStore());

    for (let index = 0; index < 20; index += 1) {
      expect(guard.canActivate(context(ThrottledSample.prototype.libre))).toBe(true);
    }
  });
});
