import test from "node:test";
import assert from "node:assert/strict";
import { buildCodexPromptInput } from "../src/sessions/ManagedSession.js";

test("buildCodexPromptInput pastes text and submits with Enter", () => {
  const sequence = buildCodexPromptInput("hola largo ".repeat(60).trim());

  assert.equal(sequence.clear, "\x15\x01\x0b");
  assert.match(sequence.paste, /^\x1b\[200~/);
  assert.match(sequence.paste, /\x1b\[201~$/);
  assert.equal(sequence.paste.includes("\n"), false);
  assert.equal(sequence.submit, "\r");
});

test("buildCodexPromptInput normalizes explicit multiline prompts before paste", () => {
  const sequence = buildCodexPromptInput("hola\r\nmundo");

  assert.equal(sequence.paste, "\x1b[200~hola\nmundo\x1b[201~");
});
