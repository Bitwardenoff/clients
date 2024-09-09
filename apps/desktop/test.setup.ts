import "jest-preset-angular/setup-jest";

import { TransformStream, WritableStream, ReadableStream } from "node:stream/web";
(globalThis as any).TransformStream = TransformStream;
(globalThis as any).WritableStream = WritableStream;
(globalThis as any).ReadableStream = ReadableStream;

Object.defineProperty(window, "CSS", { value: null });
Object.defineProperty(window, "getComputedStyle", {
  value: () => {
    return {
      display: "none",
      appearance: ["-webkit-appearance"],
    };
  },
});

Object.defineProperty(document, "doctype", {
  value: "<!DOCTYPE html>",
});
Object.defineProperty(document.body.style, "transform", {
  value: () => {
    return {
      enumerable: true,
      configurable: true,
    };
  },
});
