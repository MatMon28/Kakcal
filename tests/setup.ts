import 'fake-indexeddb/auto';
import { Blob as NodeBlob } from 'node:buffer';

// jsdom's Blob does not survive fake-indexeddb's structured clone; Node's does (browsers have a native Blob).
globalThis.Blob = NodeBlob as unknown as typeof Blob;
