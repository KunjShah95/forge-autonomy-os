import { ContextGraph, GraphEntry } from '@ai-platform/core';
import { AgentType } from '../types';

/**
 * Context Engine for ForgeAI
 * The AI memory + reasoning layer that connects to all systems
 */
export interface ContextRecord {
  id: string;
  entityType: 'REPO' | 'COMMIT' | 'PR' | 'CHANGED_FILE' | 'DEPLOYMENT' | 'SYSTEM_ERROR' | 'INCIDENT';
  entityTypeTag: string;
  metadata: Record<string, any>;
  relationships: Record<string, ContextRecord>;
  graphNodes: ContextRecord[];
  createdAt: number;
}

interface GraphEntryContext {
  context: {
    repo?: { id: string; name: string; owner: { login: string }; fork?: boolean };
    commit?: { message: string };
    pullRequest?: string;
    artifact?: string;
    service?: string;
  };
}

export interface ContextManager {
  createRecord(entity: ContextRecord['entityType'], entityTypeTag: string,
                metadata: Record<string, any>): ContextRecord;
  graphEntry(etype: ContextRecord['entityType'], eTag: string, context: GraphEntryContext): GraphEntry;
  enrichRecord(record: ContextRecord): ContextRecord;
  delete(entityType: ContextRecord['entityType'], entityTypeTag: string): void;
}

export class ContextManager {
  private records: Record<string, ContextRecord> = {};
  private graphIndex: Record<string, GraphEntry> = {};

  createRecord(entityType: ContextRecord['entityType'], entityTypeTag: string,
                metadata: Record<string, any>): ContextRecord {
    const id = crypto.randomBytes(8).toString('hex');
    const record: ContextRecord = {
      id, entityType, entityTypeTag, metadata: { id, createdAt: Date.now() },
      relationships: {}, graphNodes: [{ id, timestamp: Date.now(), ...metadata }],
    };
    this.records[id] = record;
    return record;
  }

  graphEntry(etype: ContextRecord['entityType'], eTag: string, context: GraphEntryContext): GraphEntry {
    const entry = {
      eTag,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    this.graphIndex[eTag] = entry;
    return entry;
  }

  enrichRecord(record: ContextRecord): ContextRecord {
    return { ...record, graphNodes: [
      ...record.graphNodes,
      ...Object.values(this.graphIndex).map(g => ({
        node: { eTag: g.eTag, id: g.id, timestamp: g.timestamp, context: (g.context as GraphEntryContext).context }
      }))
    ]);
  }

  delete(entityType: ContextRecord['entityType'], entityTypeTag: string): void {
    delete this.records[entityTypeTag];
    delete this.graphIndex[entityTypeTag];
  }
}

export const contextManager: ContextManager = {
  createRecord, graphEntry, enrichRecord, delete
};

/**
 * AI Agent Orchestrator
 * Manages multiple autonomous agents working together
 */
export interface AgentConfig {
  type: AgentType;
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  tools: string[];
}

export type AgentState = 'WAITING' | 'ANALYZING' | 'DECODING' | 'EXECUTING' | 'DONE' | 'ERROR';

export interface AgentExecutionTrace {
  agentId: string;
  sequence: number;
  startTime: number;
  completionTime: number;
  state: AgentState;
  output: string;
  logs?: string[];
  inputs?: any;
  context?: string;
}

class AgentManager {
  private readonly agents: Map<string, { state: AgentState, executionTrace: AgentExecutionTrace[] }> = new Map();

  createAgent(type: AgentType, capabilities: string[], tools: string[]): AgentConfig {
    return {
      ...{ id: crypto.randomUUID(), name: type + ' Agent', description: '' },
      capabilities,
      tools,
      state: 'WAITING',
      executionTrace: [],
    };
  }

  startAgent(agent: AgentConfig): AgentExecutionTrace[] {
    const newTrace: AgentExecutionTrace = {
      agentId: agent.id,
      sequence: 0,
      startTime: Date.now(),
      state: 'ANALYZING',
      output: '',
      logs: [],
      inputs: agent,
    };
    this.agents.set(agent.id, { state: 'WAITING', executionTrace: [newTrace] });
    this.addAgentToQueue(agent.id, [newTrace.state, 'WAITING']);
    return [newTrace];
  }

  addAgentToQueue(agentId: string: string, states: AgentState[]) {
    if (!this.agents.has(agentId)) {
      this.agents.set(agentId, { state: 'WAITING', executionTrace: [] });
    }
    const stateIdx = states.indexOf(state);
    this.agents.get(agentId)! executionTrace = (this.agents.get(agentId)! executionTrace as any).slice(0, stateIdx + 1);
  }

  getAgentState(agentId: string): AgentState | undefined {
    return this.agents.get(agentId)!.state;
  }

  getAgentTrace(agentId: string): AgentExecutionTrace[] | undefined {
    return this.agents.get(agentId)!.executionTrace;
  }

  updateState(agentId: string, nextState: AgentState): AgentExecutionTrace[] | undefined {
    const agent = this.agents.get(agentId)!;
    const trace = agent.executionTrace;
    const stateIdx = trace.findIndex(t => t.state === nextState) + 1;
    if (stateIdx < trace.length) {
      trace[stateIdx] = trace.splice(stateIdx)[0] as any;
    }
    if (nextState === 'DONE') {
      agent.state = 'DONE';
    }
    return trace;
  }

  processNextState(agentId: string): AgentState | undefined {
    if (!agentId || !this.agents.has(agentId)) return undefined;
    const agent = this.agents.get(agentId)!;
    const trace = agent.executionTrace;
    if (trace.length === 0) return undefined;
    trace.shift();
    const nextState = trace[0]?.state;
    if (nextState === 'DONE') return 'DONE';
    if (nextState === 'DONE') return 'WAITING';
    return 'WAITING';
  }

  resolveAgent(agentId: string, nextState: AgentState): AgentExecutionTrace[] | undefined {
    const trace = this.agents.get(agentId)?.executionTrace;
    if (!trace) return undefined;
    const idx = trace.findIndex(t => t.state === nextState);
    if (idx !== -1 && idx < trace.length - 1) {
      trace[idx] = trace.splice(idx + 1)[0] as any;
    }
    return trace;
  }
}

export const agentManager: AgentManager = new AgentManager();
