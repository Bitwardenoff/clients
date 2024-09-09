import { TransformStream, WritableStream, ReadableStream } from "node:stream/web";
(globalThis as any).TransformStream = TransformStream;
(globalThis as any).WritableStream = WritableStream;
(globalThis as any).ReadableStream = ReadableStream;
