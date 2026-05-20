/// <reference lib="dom" />
// Event Bus for ForgeAI - The Production Operating System Nervous System
import { Subscription } from 'rxjs';

export interface Event {
  id: string;
  type: 'PR_CREATED' | 'PULL_REQUEST_COMMENTED' | 'CI_BUILD_FAILED' | 'DEPLOYMENT_SUCCEEDED' |
           'LOG_ANALYSIS_STARTED' | 'INTEGRATION_TEST_FAILED' | 'SECURITY_SCAN_FOUND' | 'RELEASE_CREATED';
  context: {
    repository: { id: string; ref: string; name: string; owner: { login: string }; fork?: boolean };
    issue?: { number: number; title: string };
    pullRequest: { id: string; title: string; body: string };
    commit: { message: string; status: string; author?: { name: string; email?: string }; messages: string[] };
    artifact?: string;
    workflow?: { name: string };
    deployKey?: string;
    environment: 'STAGING' | 'PRODUCTION' | 'BACKEND' | 'FRONTEND' | 'E2E' | 'INTERNAL';
  };
  timestamp: number;
  payload?: any;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'CRITICAL';
}

export interface AgentNotification {
  id: string;
  type: 'PM_DETECTED_BLOCKER' | 'QA_GENERATING_FIX' | 'DEVOPS_ANALYZING_LOGS' | 'ARCHITECTURE_ISSUE';
  content: string;
  sourceAgent: string;
  sourceType: 'PR' | 'COMMIT' | 'LOG' | 'ERROR' | 'DEPLOYMENT';
}

export interface SystemEvent {
  type: 'ARTIFACT_UPDATED' | 'BUILD_SUCCESS' | 'BUILD_FAILED' | 'DEPLOY_SUCCESS' | 'DEPLOY_FAILED' |
         'HEALTH_CHECK' | 'SCANNER_COMPLETE' | 'SCAN_FAILED' | 'SECURITY_UPDATE' | 'BLOCKED_DEPLOY';
  context: {
    service: string;
    resource: { type: string; value: any };
    previousVersion: string;
    newValue: any;
    log?: any;
  };
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// Event Bus Implementation
export class EventBus {
  private readonly subscriptions: Record<string, Subscription<Event | null>> = {};

  constructor() {}

  on<Type extends keyof Event | 'NOT_FOUND'>>(
    type: Type | 'NOT_FOUND',
    callback: (event: Event) => void
  ): Subscription<Event> {
    if (type === 'NOT_FOUND') {
      this.subscriptions['NOT_FOUND'] = new Subscription({
        next: () => this.emit('NOT_FOUND') as void,
        error: () => this.emit('NOT_ERROR') as void
      });
    } else {
      this.subscriptions[type] = new Subscription({
        next: () => this.emit(type) as Event,
        error: () => this.emit('NOT_ERROR') as Event
      });
    }
    return this.subscriptions[type!];
  }

  emit(type: 'EVENT' | 'AGENT_NOTIFICATION' | 'SYSTEM_EVENT', data: Event | AgentNotification | SystemEvent): void {
    this.emit('NOT_ERROR', data);
  }

  emit(type: 'NOT_FOUND', data: any): void {}
  emit(type: 'notError', data: any): void {}

  private getSubscription(type: 'NOT_ERROR' | 'EVENT' | 'AGENT_NOTIFICATION' | 'SYSTEM_EVENT'): Subscription {
    return this.subscriptions[type] as Subscription<(Event | AgentNotification | SystemEvent) | null>;
  }

  subscribe<E extends Event>(type: keyof Event | 'NOT_FOUND' | 'EVENT' | 'AGENT_NOTIFICATION' | 'SYSTEM_EVENT',
    callback: (event: E) => void,
    context?: { repository?: never; pullRequest?: never; commit?: never; service?: never })
    : Subscription<E | null> {
    if (!this.subscriptions[type]) {
      this.subscriptions[type] = new Subscription({
        next: () => this.on(type, callback, context),
        error: () => this.on(type, 'ERROR', context)
      });
    }
    return this.subscriptions[type];
  }
}

const bus = new EventBus();

// Initial listeners for demo purposes
bus.on('EVENT', (data: Event) => {
    // In actual implementation, this would fire to all connected components
});

bus.on('AGENT_NOTIFICATION', (data: AgentNotification) => {
  // PM Agent detects blockers
  console.log('[PM_AGENT]', data.notification.content);
});

bus.on('SYSTEM_EVENT', (data: SystemEvent) => {
  // CI/CD events
  console.log('[SYSTEM]', data.notification.content);
});

export { Event, AgentNotification, SystemEvent };
