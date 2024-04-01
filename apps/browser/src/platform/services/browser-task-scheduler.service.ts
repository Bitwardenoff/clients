import { firstValueFrom, map, Observable } from "rxjs";

import { LogService } from "@bitwarden/common/platform/abstractions/log.service";
import { TaskIdentifier } from "@bitwarden/common/platform/abstractions/task-scheduler.service";
import { ScheduledTaskName } from "@bitwarden/common/platform/enums/scheduled-task-name.enum";
import { TaskSchedulerService } from "@bitwarden/common/platform/services/task-scheduler.service";
import {
  TASK_SCHEDULER_DISK,
  GlobalState,
  KeyDefinition,
  StateProvider,
} from "@bitwarden/common/platform/state";

import { BrowserApi } from "../browser/browser-api";

import {
  ActiveAlarm,
  BrowserTaskSchedulerService as BrowserTaskSchedulerServiceInterface,
} from "./abstractions/browser-task-scheduler.service";

const ACTIVE_ALARMS = new KeyDefinition(TASK_SCHEDULER_DISK, "activeAlarms", {
  deserializer: (value: ActiveAlarm[]) => value ?? [],
});

export class BrowserTaskSchedulerService
  extends TaskSchedulerService
  implements BrowserTaskSchedulerServiceInterface
{
  private activeAlarmsState: GlobalState<ActiveAlarm[]>;
  readonly activeAlarms$: Observable<ActiveAlarm[]>;
  private recoveredAlarms: Set<string> = new Set();
  private onAlarmHandlers: Record<string, () => void> = {};

  constructor(
    private logService: LogService,
    private stateProvider: StateProvider,
  ) {
    super();

    this.activeAlarmsState = this.stateProvider.getGlobal(ACTIVE_ALARMS);
    this.activeAlarms$ = this.activeAlarmsState.state$.pipe(
      map((activeAlarms) => activeAlarms ?? []),
    );

    this.setupOnAlarmListener();
    this.verifyAlarmsState().catch((e) => this.logService.error(e));
  }

  /**
   * Sets a timeout to execute a callback after a delay. If the delay is less
   * than 1 minute, it will use the global setTimeout. Otherwise, it will
   * create a browser extension alarm to handle the delay.
   *
   * @param callback - The function to be called after the delay.
   * @param delayInMs - The delay in milliseconds.
   * @param taskName - The name of the task, used in defining the alarm.
   */
  async setTimeout(
    callback: () => void,
    delayInMs: number,
    taskName: ScheduledTaskName,
  ): Promise<number | NodeJS.Timeout> {
    const delayInMinutes = delayInMs / 1000 / 60;
    if (delayInMinutes < 1) {
      return super.setTimeout(callback, delayInMs);
    }

    this.registerAlarmHandler(taskName, callback);
    if (this.recoveredAlarms.has(taskName)) {
      await this.triggerRecoveredAlarm(taskName);
      return;
    }

    await this.createAlarm(taskName, { delayInMinutes });
  }

  /**
   * Sets an interval to execute a callback at each interval. If the interval is
   * less than 1 minute, it will use the global setInterval. Otherwise, it will
   * create a browser extension alarm to handle the interval.
   *
   * @param callback - The function to be called at each interval.
   * @param intervalInMs - The interval in milliseconds.
   * @param taskName - The name of the task, used in defining the alarm.
   * @param initialDelayInMs - The initial delay in milliseconds.
   */
  async setInterval(
    callback: () => void,
    intervalInMs: number,
    taskName: ScheduledTaskName,
    initialDelayInMs?: number,
  ): Promise<number | NodeJS.Timeout> {
    const intervalInMinutes = intervalInMs / 1000 / 60;
    if (intervalInMinutes < 1) {
      return super.setInterval(callback, intervalInMs);
    }

    this.registerAlarmHandler(taskName, callback);
    if (this.recoveredAlarms.has(taskName)) {
      await this.triggerRecoveredAlarm(taskName, intervalInMinutes);
    }

    const initialDelayInMinutes = initialDelayInMs ? initialDelayInMs / 1000 / 60 : undefined;
    await this.createAlarm(taskName, {
      periodInMinutes: intervalInMinutes,
      delayInMinutes: initialDelayInMinutes ?? intervalInMinutes,
    });
  }

  /**
   * Clears a scheduled task by its task identifier. If the task identifier
   * contains a task name, it will clear the browser extension alarm with that
   * name.
   *
   * @param taskIdentifier - The task identifier containing the task name.
   */
  async clearScheduledTask(taskIdentifier: TaskIdentifier): Promise<void> {
    void super.clearScheduledTask(taskIdentifier);

    const { taskName } = taskIdentifier;
    if (!taskName) {
      return;
    }

    const wasCleared = await BrowserApi.clearAlarm(taskName);
    if (wasCleared) {
      await this.deleteActiveAlarm(taskName);
      this.recoveredAlarms.delete(taskName);
    }
  }

  async clearAllScheduledTasks(): Promise<void> {
    await BrowserApi.clearAllAlarms();
    await this.updateActiveAlarms([]);
    this.onAlarmHandlers = {};
    this.recoveredAlarms.clear();
  }

  private async createAlarm(
    name: ScheduledTaskName,
    createInfo: chrome.alarms.AlarmCreateInfo,
  ): Promise<void> {
    const existingAlarm = await BrowserApi.getAlarm(name);
    if (existingAlarm) {
      this.logService.warning(`Alarm ${name} already exists. Skipping creation.`);
      return;
    }

    await BrowserApi.createAlarm(name, createInfo);
    await this.setActiveAlarm({ name, startTime: Date.now(), createInfo });
  }

  private registerAlarmHandler(name: ScheduledTaskName, handler: CallableFunction): void {
    if (this.onAlarmHandlers[name]) {
      this.logService.warning(`Alarm handler for ${name} already exists. Overwriting.`);
    }

    this.onAlarmHandlers[name] = () => handler();
  }

  private async verifyAlarmsState(): Promise<void> {
    const currentTime = Date.now();
    const activeAlarms = await firstValueFrom(this.activeAlarms$);

    for (const alarm of activeAlarms) {
      const { name, startTime, createInfo } = alarm;
      const existingAlarm = await BrowserApi.getAlarm(name);
      if (existingAlarm) {
        continue;
      }

      if (
        (createInfo.when && createInfo.when < currentTime) ||
        (!createInfo.periodInMinutes &&
          createInfo.delayInMinutes &&
          startTime + createInfo.delayInMinutes * 60 * 1000 < currentTime)
      ) {
        this.recoveredAlarms.add(name);
        continue;
      }

      void this.createAlarm(name, createInfo);
    }

    // 10 seconds after verifying the alarm state, we should treat any newly created alarms as non-recovered alarms.
    globalThis.setTimeout(() => this.recoveredAlarms.clear(), 10 * 1000);
  }

  private async setActiveAlarm(alarm: ActiveAlarm): Promise<void> {
    const activeAlarms = await firstValueFrom(this.activeAlarms$);
    activeAlarms.push(alarm);
    await this.updateActiveAlarms(activeAlarms);
  }

  private async deleteActiveAlarm(name: ScheduledTaskName): Promise<void> {
    delete this.onAlarmHandlers[name];
    const activeAlarms = await firstValueFrom(this.activeAlarms$);
    const filteredAlarms = activeAlarms?.filter((alarm) => alarm.name !== name);
    await this.updateActiveAlarms(filteredAlarms || []);
  }

  private async updateActiveAlarms(alarms: ActiveAlarm[]): Promise<void> {
    await this.activeAlarmsState.update(() => alarms);
  }

  private async triggerRecoveredAlarm(
    name: ScheduledTaskName,
    periodInMinutes?: number,
  ): Promise<void> {
    this.recoveredAlarms.delete(name);
    await this.triggerAlarm(name, periodInMinutes);
  }

  private setupOnAlarmListener(): void {
    BrowserApi.addListener(chrome.alarms.onAlarm, this.handleOnAlarm);
  }

  private handleOnAlarm = async (alarm: chrome.alarms.Alarm): Promise<void> => {
    const { name, periodInMinutes } = alarm;
    await this.triggerAlarm(name as ScheduledTaskName, periodInMinutes);
  };

  private async triggerAlarm(name: ScheduledTaskName, periodInMinutes?: number): Promise<void> {
    const handler = this.onAlarmHandlers[name];
    if (!periodInMinutes) {
      await this.deleteActiveAlarm(name);
    }

    if (handler) {
      handler();
    }
  }
}
