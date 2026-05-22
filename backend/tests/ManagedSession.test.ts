import test from "node:test";
import assert from "node:assert/strict";
import { buildCodexPromptInput } from "../src/sessions/ManagedSession.js";

test("buildCodexPromptInput pastes text and submits with a normal enter", () => {
  const sequence = buildCodexPromptInput("hola\r\nmundo");

  assert.equal(sequence.clear, "\x15\x01\x0b");
  assert.equal(sequence.paste, "\x1b[200~hola\nmundo\x1b[201~");
  assert.equal(sequence.submit, "\r");
});
