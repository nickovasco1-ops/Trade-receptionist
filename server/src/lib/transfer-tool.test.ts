import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildTransferTool, TRANSFER_TOOL_NAME } from './transfer-tool';

/**
 * Transfers never worked for any tenant: the tool was sent as bridge_transfer,
 * which Retell only runs inside an agentic warm transfer. The first caller to
 * ask to be put through (2026-09-28) was told the call could not be connected.
 */
describe('buildTransferTool', () => {
  const tool = buildTransferTool('+447700900123');

  test('is a transfer_call, the tool Retell runs on an ordinary agent', () => {
    assert.equal(tool.type, 'transfer_call');
    assert.notEqual(tool.type as string, 'bridge_transfer');
  });

  test('rings the given number', () => {
    assert.deepEqual(tool.transfer_destination, { type: 'predefined', number: '+447700900123' });
  });

  test('keeps the name the prompt tells the agent to use', () => {
    assert.equal(tool.name, 'TransferToOwner');
    assert.equal(tool.name, TRANSFER_TOOL_NAME);
  });

  test('is a cold transfer dialled as a new leg', () => {
    assert.deepEqual(tool.transfer_option, { type: 'cold_transfer', cold_transfer_mode: 'sip_invite' });
  });
});

describe('the agent is built with it', () => {
  // The regression itself: the invalid shape must not come back by hand.
  test('services/retell.ts no longer hand-writes a bridge_transfer tool', () => {
    const source = readFileSync(resolve(__dirname, '../services/retell.ts'), 'utf8');
    assert.ok(!source.includes("'bridge_transfer'"), 'bridge_transfer only works inside an agentic warm transfer');
    assert.ok(source.includes('buildTransferTool('), 'the owner transfer must come from buildTransferTool()');
  });
});
