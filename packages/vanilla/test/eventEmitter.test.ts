import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from '../src/eventEmitter.js';

describe('EventEmitter', () => {
  it('should register and emit events', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();

    emitter.on('test', handler);
    emitter.emit('test', 'arg1', 'arg2');

    expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('should allow multiple handlers for same event', () => {
    const emitter = new EventEmitter();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    emitter.on('test', handler1);
    emitter.on('test', handler2);
    emitter.emit('test', 'data');

    expect(handler1).toHaveBeenCalledWith('data');
    expect(handler2).toHaveBeenCalledWith('data');
  });

  it('should unsubscribe via returned function', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();

    const unsubscribe = emitter.on('test', handler);
    unsubscribe();
    emitter.emit('test');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should unsubscribe via off method', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();

    emitter.on('test', handler);
    emitter.off('test', handler);
    emitter.emit('test');

    expect(handler).not.toHaveBeenCalled();
  });

  it('should remove all listeners', () => {
    const emitter = new EventEmitter();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    emitter.on('test1', handler1);
    emitter.on('test2', handler2);
    emitter.removeAllListeners();
    emitter.emit('test1');
    emitter.emit('test2');

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it('should handle emit when no listeners registered', () => {
    const emitter = new EventEmitter();

    expect(() => {
      emitter.emit('nonexistent');
    }).not.toThrow();
  });
});
